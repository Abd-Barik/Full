import json, uuid
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import connections
from rest_framework.decorators import api_view
from django.utils import timezone
from django.db.models import Max
from .models import Panelcompany
from rest_framework import status
from django.db import transaction
from django.views.decorators.http import require_http_methods


@csrf_exempt
@api_view(['GET'])
def get_panel_company(request):
    branch_rno = request.session.get('branch_rno')
    gc_rno = request.session.get('group')
    pcompanyname = request.GET.get("com_name")

    draw = int(request.GET.get("draw", 1))
    start = int(request.GET.get("start", 0))
    length_param = request.GET.get("length")
    length = int(length_param) if length_param and length_param.isdigit() else None

    order_col_index = request.GET.get("order[0][column]")
    order_dir = request.GET.get("order[0][dir]", "asc")

    # 這裡的 column_map 要改成 branch_name 而不是 branch_rno
    column_map = [
        "b.branchname",
        "p.panelcomp_rno",
        "p.pcompanyname",
        "p.pcompany_no",
        "p.pcompanyTIN",
        "p.pcompanyRegNo",
        "p.contactperson",
        "p.createdon"
    ]

    try:
        connection = connections['cloudmssql']
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT branch_rno
                FROM [Clinics].[GroupClinicList]
                WHERE gc_rno = %s
            """, [gc_rno])
            branch_list = [b[0] for b in cursor.fetchall()]
            if not branch_list:
                if branch_rno:
                    branch_list = [branch_rno]
                else:
                    return JsonResponse({
                        "draw": draw,
                        "recordsTotal": 0,
                        "recordsFiltered": 0,
                        "data": []
                    })

            # 改成 JOIN，並用 b 取 branch 表欄位
            base_query = f"""
                FROM [Clinics].[panelcompany] p
                INNER JOIN [inventory].[branch] b
                    ON p.privatebranch_rno = b.branch_rno
                WHERE p.privatebranch_rno IN ({','.join(['%s'] * len(branch_list))})
            """
            params = branch_list

            if pcompanyname:
                base_query += " AND p.pcompanyname LIKE %s"
                params.append(f"%{pcompanyname}%")

            # 先算總筆數
            count_query = f"SELECT COUNT(*) {base_query}"
            cursor.execute(count_query, params)
            total_records = cursor.fetchone()[0]

            # 如果 length 沒有指定，就撈全部
            if length is None:
                length = total_records

            order_by = "ORDER BY b.branchname, p.pcompanyname"
            if order_col_index and order_col_index.isdigit():
                col_index = int(order_col_index)
                if 0 <= col_index < len(column_map):
                    order_column = column_map[col_index]
                    order_by = f"ORDER BY {order_column} {order_dir}"

            query = f"""
                SELECT
                    p.privatebranch_rno as branch_rno,
                    b.branchname as branch,
                    p.panelcomp_rno as reference,
                    '' as group_com_name,
                    p.createdon as opendate,
                    p.pcompany_no as corporate_AC,
                    p.pcompanyname as corporate_name,
                    '' as Einvoice,
                    p.pcompanyTIN as tin,
                    p.pcompanyRegNo as com_reg_no,
                    '' as portal_corp,
                    p.isactive as active,
                    p.contactperson as contact_person,
                    p.default_ceiling as default_ceiling,
                    p.default_consultation as default_con,
                    '' as stock_item,
                    '' as svr_item,
                    p.invoiceoption1 as option1,
                    p.invoiceoption2 as option2,
                    '' as center_process,
                    p.address1 as address
                {base_query}
                {order_by}
                OFFSET %s ROWS FETCH NEXT %s ROWS ONLY
            """
            params.extend([start, length])
            cursor.execute(query, params)
            rows = cursor.fetchall()
            columns = [col[0] for col in cursor.description]

        data = [dict(zip(columns, row)) for row in rows]

        return JsonResponse({
            "draw": draw,
            "recordsTotal": total_records,
            "recordsFiltered": total_records,
            "data": data
        })

    except Exception as e:
        return JsonResponse({
            "draw": draw,
            "recordsTotal": 0,
            "recordsFiltered": 0,
            "data": [],
            "error": str(e)
        })

@csrf_exempt
@api_view(['GET'])
def get_client_data(request):
    branch = request.GET.get("branch")
    reference = request.GET.get("reference")

    if not reference:
        return JsonResponse({"error": "reference is required"}, status=400)

    try:
        connection = connections['cloudmssql']
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT * 
                FROM [Clinics].[panelcompany]
                WHERE privatebranch_rno = %s AND panelcomp_rno = %s
            """, [branch, reference])

            row = cursor.fetchone()
            if not row:
                return JsonResponse({"error": "Client not found"}, status=404)

            # 取得欄位名稱
            columns = [col[0] for col in cursor.description]

        # 把資料組成 dict
        data = dict(zip(columns, row))

        return JsonResponse(data, safe=False)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def save_panel_company(request):
    """
    儲存企業客戶資料到 Panelcompany 模型
    """
    branch_rno = request.session.get('branch_rno')
    username = request.session.get('username')
    
    try:
        # 1. 解析 JSON 請求資料
        if request.content_type == 'application/json':
            data = json.loads(request.body)
        else:
            data = request.POST.dict()


        # 3. 取得 Panelcompany 資料表欄位資訊
        def get_table_columns():
            with connections['cloudmssql'].cursor() as cursor:
                cursor.execute("""
                    SELECT COLUMN_NAME, DATA_TYPE
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = 'Clinics'
                    AND TABLE_NAME = 'Panelcompany'
                """)
                return {row[0]: row[1] for row in cursor.fetchall()}

        table_columns = get_table_columns()
        valid_columns = set(table_columns.keys())

        # 4. 準備額外必要欄位
        extra_fields = {
            "panelcomp_uid": str(uuid.uuid4()),
            "privatebranch_rno": branch_rno,
            "createdon": timezone.now(),
            "createdby": username,
        }

        # 5. 合併所有資料
        all_data = {**data, **extra_fields}

        # 6. 過濾出有效的資料庫欄位
        panel_company_data = {k: v for k, v in all_data.items() if k in valid_columns}

        if not panel_company_data:
            print("❌ 沒有有效欄位")
            print("收到的 data:", data)
            print("有效欄位:", valid_columns)
            return JsonResponse({'error': '沒有有效的資料欄位'}, status=400)

        # 8. SQL Server 資料型態轉換
        for col, val in panel_company_data.items():
            col_type = table_columns[col].lower()
            
            if val == "" or val is None:
                panel_company_data[col] = None
            elif col_type == 'bit':
                # 轉換為 BIT 型態 (0/1)
                if str(val).lower() in ('on', 'true', '1', 'yes', True):
                    panel_company_data[col] = 1
                else:
                    panel_company_data[col] = 0
            elif col_type in ('int', 'bigint', 'smallint', 'tinyint'):
                try:
                    panel_company_data[col] = int(val) if val else None
                except (ValueError, TypeError):
                    if val:  # 只在有值的情況下報錯
                        raise ValueError(f"欄位 {col} 需要整數型態，但收到的值是: {val}")
            elif col_type in ('decimal', 'numeric', 'float', 'real', 'money'):
                try:
                    panel_company_data[col] = float(val) if val else None
                except (ValueError, TypeError):
                    if val:  # 只在有值的情況下報錯
                        raise ValueError(f"欄位 {col} 需要數值型態，但收到的值是: {val}")

        # 9. 設定預設值給 BIT 欄位（如果沒有值）
        bit_defaults = {
            'isactive': 1,
            'no_einvoice': 0,
            'sst_exempted': 0,
            'rounding_by_item': 0,
            'rounding_by_billing': 0,
        }
        
        for bit_field, default_val in bit_defaults.items():
            if bit_field in valid_columns and bit_field not in panel_company_data:
                panel_company_data[bit_field] = default_val

        # 10. 建立 SQL INSERT 語句
        columns_sql = ', '.join(f'[{col}]' for col in panel_company_data.keys())
        placeholders = ', '.join(['%s'] * len(panel_company_data))
        sql = f"INSERT INTO [Clinics].[Panelcompany] ({columns_sql}) VALUES ({placeholders})"
        values = list(panel_company_data.values())

        # 11. 執行 SQL
        try:
            with connections['cloudmssql'].cursor() as cursor:
                print(f"Executing SQL: {sql}")
                print(f"Values count: {len(values)}")
                cursor.execute(sql, values)
                print("SQL executed successfully")
        except Exception as sql_error:
            print(f"SQL execution error: {str(sql_error)}")
            print(f"SQL: {sql}")
            print(f"Values: {values}")
            raise sql_error

        # 12. 記錄被忽略的欄位
        ignored_fields = set(all_data.keys()) - valid_columns

        return JsonResponse({
            'status': 'success',
            'message': '企業客戶資料儲存成功',
            'saved_fields': list(panel_company_data.keys()),
            'ignored_fields': list(ignored_fields) if ignored_fields else []
        })

    except ValueError as ve:
        return JsonResponse({
            'status': 'error',
            'message': f'資料格式錯誤: {str(ve)}',
            'type': 'ValueError',
        }, status=400)
        
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': f'儲存企業客戶資料時發生錯誤: {str(e)}',
            'type': type(e).__name__,
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def update_panel_company(request):
    """
    更新企業客戶資料 (依 branch + reference)
    """
    try:
        # 1. 解析 JSON 請求資料
        if request.content_type == 'application/json':
            data = json.loads(request.body)
        else:
            data = request.POST.dict()

        branch = data.get("branch")
        reference = data.get("reference")

        if not branch or not reference:
            return JsonResponse({
                "status": "error",
                "message": "branch 與 reference 是必填欄位"
            }, status=400)

        # 2. 取得 Panelcompany 資料表欄位資訊
        def get_table_columns():
            with connections['cloudmssql'].cursor() as cursor:
                cursor.execute("""
                    SELECT COLUMN_NAME, DATA_TYPE
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = 'Clinics'
                    AND TABLE_NAME = 'Panelcompany'
                """)
                return {row[0]: row[1] for row in cursor.fetchall()}

        table_columns = get_table_columns()
        valid_columns = set(table_columns.keys())

        # 3. 過濾有效欄位
        update_data = {k: v for k, v in data.items() if k in valid_columns and k not in ("branch", "reference")}

        if not update_data:
            return JsonResponse({
                "status": "error",
                "message": "沒有有效的更新欄位"
            }, status=400)

        # 4. 型態轉換（跟 save 一樣）
        for col, val in update_data.items():
            col_type = table_columns[col].lower()
            if val == "" or val is None:
                update_data[col] = None
            elif col_type == 'bit':
                update_data[col] = 1 if str(val).lower() in ('on', 'true', '1', 'yes') else 0
            elif col_type in ('int', 'bigint', 'smallint', 'tinyint'):
                update_data[col] = int(val)
            elif col_type in ('decimal', 'numeric', 'float', 'real', 'money'):
                update_data[col] = float(val)

        # 5. modifiedby 從 session 取
        modifiedby = request.session.get('editname')

        # 6. 組合 UPDATE SQL
        set_clause = ', '.join(f"[{col}] = %s" for col in update_data.keys())
        sql = f"""
            UPDATE [Clinics].[Panelcompany]
            SET {set_clause}, modifiedon = GETDATE(), modifiedby = %s
            WHERE privatebranch_rno = %s AND panelcomp_rno = %s
        """
        values = list(update_data.values()) + [modifiedby, branch, reference]

        # 7. 執行 SQL
        with connections['cloudmssql'].cursor() as cursor:
            cursor.execute(sql, values)

        return JsonResponse({
            "status": "success",
            "message": "企業客戶資料更新成功",
            "updated_fields": list(update_data.keys()),
            "modifiedby": modifiedby
        })

    except Exception as e:
        return JsonResponse({
            "status": "error",
            "message": f"更新企業客戶資料時發生錯誤: {str(e)}",
            "type": type(e).__name__
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def delete_panel_company(request):
    
    
    """Delete customer data from MSSQL database using raw SQL"""
    try:
        # 從 POST 請求中提取數據
        data = json.loads(request.body)
        privatebranch_rno = data.get('privatebranch_rno', '').strip()
        panelcomp_rno = data.get('panelcomp_rno', '').strip()

        
        # 使用原生 SQL 刪除資料
        with transaction.atomic(using='cloudmssql'):
            cursor = connections['cloudmssql'].cursor()
            try:
                # 首先檢查客戶是否存在
                cursor.execute("""
                    SELECT COUNT(*) FROM [Clinics].[panelcompany]
                    WHERE privatebranch_rno = %s AND panelcomp_rno = %s
                """, [privatebranch_rno, panelcomp_rno])
                
                if cursor.fetchone()[0] == 0:
                    return JsonResponse({
                        'success': False,
                        'error': 'Customer not found'
                    })
                
                # 執行刪除操作
                cursor.execute("""
                    DELETE FROM [Clinics].[panelcompany] 
                    WHERE privatebranch_rno = %s AND panelcomp_rno = %s
                """, [privatebranch_rno, panelcomp_rno])
                
                # 檢查是否有行被刪除
                rows_affected = cursor.rowcount
                
                if rows_affected == 0:
                    return JsonResponse({
                        'success': False,
                        'error': 'No records were deleted'
                    })
                
            finally:
                cursor.close()
        
        return JsonResponse({
            'success': True,
            'message': f'Company {panelcomp_rno} deleted successfully',
            'rows_affected': rows_affected
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Database error: {str(e)}'
        })