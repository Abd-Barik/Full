from django.db import connections
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import json
from datetime import datetime
from django.utils import timezone
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
import logging
from .models import Customer
from .serializers import  sentoqueuedetail

@api_view(['GET'])
def Queue_list(request):
    branch_rno = request.session.get('branch_rno')
    gc_rno = request.session.get('group')  # 获取 group 信息

    try:
        # 获取分页参数
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        search = request.GET.get('search', '').strip()
        page_size = min(page_size, 100)  # 限制最大 page_size

        # 🆕 获取过滤器参数
        branch_filter = request.GET.get('branch_rno', branch_rno)  # 允许覆盖默认分支
        visittype = request.GET.get('visittype', 'O')  # 默认门诊
        
        # 🔑 获取状态参数 - 支持多选
        status_list = request.GET.getlist('status')  # 获取所有status参数
        if not status_list:
            # 如果没有传递状态，默认选择所有状态
            status_list = ['IN', 'CL', 'CN', 'FN', 'DP', 'FD', 'FC']

        # 获取日期参数
        vdate_start = request.GET.get('start_date')
        vdate_end = request.GET.get('end_date')
        

        if vdate_start:
            vdate_start = f"{vdate_start} 00:00:00"
        if vdate_end:
            vdate_end = f"{vdate_end} 23:59:59"
        
        connection = connections['cloudmssql']

        # 🆕 修改基础 SQL，增加状态过滤
        base_sql = """
           SELECT TOP (500) * 
           FROM [Clinics].[vw_clinicvisit]
           WHERE branch_rno = %s
           
        """
        params = [branch_filter]

        # 🆕 添加访问类型过滤
        if visittype:
            base_sql += " AND visittype = %s"
            params.append(visittype)

        # 🔑 添加状态过滤（多选支持）
        if status_list:
            placeholders = ','.join(['%s'] * len(status_list))
            base_sql += f" AND status IN ({placeholders})"
            params.extend(status_list)

        # 搜索条件
        if search:
            base_sql += " AND (name LIKE %s OR icno LIKE %s OR customerno LIKE %s)"
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param])

        # 日期范围
        if vdate_start and vdate_end:
            base_sql += " AND visitdate BETWEEN %s AND %s"
            params.extend([vdate_start, vdate_end])
        elif vdate_start:
            base_sql += " AND visitdate >= %s"
            params.append(vdate_start)
        elif vdate_end:
            base_sql += " AND visitdate <= %s"
            params.append(vdate_end)

        # 排序
        base_sql += " ORDER BY visitdate ASC"


        with connection.cursor() as cursor:
            cursor.execute(base_sql, params)
            results = cursor.fetchall()
            columns = [col[0] for col in cursor.description]

        # 转成 dict 列表
        customers_data = [dict(zip(columns, row)) for row in results]

        # 分页
        total_count = len(customers_data)
        total_pages = (total_count + page_size - 1) // page_size
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        page_data = customers_data[start_index:end_index]

        return Response({
            'success': True,
            'data': page_data,
            'pagination': {
                'current_page': page,
                'page_size': page_size,
                'total_pages': total_pages,
                'total': total_count,
                'has_previous': page > 1,
                'has_next': page < total_pages,
                'previous_page': page - 1 if page > 1 else None,
                'next_page': page + 1 if page < total_pages else None,
                'start_index': start_index + 1 if total_count > 0 else 0,
                'end_index': min(end_index, total_count)
            },
            'filters': {
                'search': search,
                'branch_rno': branch_filter,
                'visittype': visittype,
                'status_list': status_list,
                'start_date': request.GET.get('start_date'),
                'end_date': request.GET.get('end_date')
            },
            'query_type': 'group' if gc_rno else 'branch',
            'available_fields': columns,
            'vdate_start': vdate_start,
            'vdate_end': vdate_end
        })

    except ValueError as e:
        return Response({
            'success': False,
            'error': 'Invalid page or page_size parameter',
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        print(f"Error in Queue_list: {str(e)}")  # 🆕 添加错误日志
        return Response({
            'success': False,
            'error': str(e),
            'message': 'Failed to fetch customer data'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

from .models import doctor

def docter_list(request):

    branch_rno = request.session.get('branch_rno')
    doctors = doctor.objects.using('cloudmssql').filter(branch_rno=branch_rno)
    doctor_data = [
        {'doctor_rno': d.doctor_rno, 'doctorname': d.doctorname}
        for d in doctors
    ]
    return JsonResponse({'doctors': doctor_data})

logger = logging.getLogger(__name__)

@login_required
@csrf_exempt
@require_http_methods(["POST"])
def save_registration(request):
    """
    保存病人注册信息到 visits 表
    """
    branch_rno = request.session.get('branch_rno')
    try:
        print("=== DEBUG START ===")
        print(f"branch_rno: {branch_rno}")

        # 获取表单数据
        if request.content_type == 'application/json':
            data = json.loads(request.body)
        else:
            data = request.POST.dict()

        print(f"Received data: {data}")

        # 获取 visits 表的字段
        def get_table_columns():
            with connections['cloudmssql'].cursor() as cursor:
                cursor.execute("""
                    SELECT COLUMN_NAME, DATA_TYPE
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = 'Clinics'
                    AND TABLE_NAME = 'visits'
                """)
                return {row[0]: row[1] for row in cursor.fetchall()}

        table_columns = get_table_columns()
        valid_columns = set(table_columns.keys())

        # 准备数据
        all_data = {}

        # 改进的 datetime 处理函数
        def parse_datetime_to_string(date_string):
            """
            将 datetime 字符串转换为 SQL Server 兼容的格式
            """
            if not date_string:
                return timezone.now().strftime('%Y-%m-%d %H:%M:%S')
            
            try:
                # 处理 HTML datetime-local 格式 (YYYY-MM-DDTHH:MM)
                if 'T' in date_string and len(date_string) == 16:
                    date_string += ':00'
                
                # 解析为 datetime 对象
                dt = datetime.fromisoformat(date_string)
                if dt.tzinfo is None:
                    dt = timezone.make_aware(dt)
                
                # 转换为 SQL Server 标准格式字符串
                return dt.strftime('%Y-%m-%d %H:%M:%S')
                
            except Exception as e:
                print(f"Date parsing error: {e}, input: {date_string}")
                return timezone.now().strftime('%Y-%m-%d %H:%M:%S')

        # 处理 visitdate 为字符串格式
        if data.get('visitdate'):
            all_data['visitdate'] = parse_datetime_to_string(data.get('visitdate'))

        # 其他非空字段（跳过 CSRF token）
        for key, value in data.items():
            if key == 'csrfmiddlewaretoken':  # 跳过 CSRF token
                continue
            if key == 'visitdate':  # visitdate 已经单独处理
                continue
            if value and str(value).strip():
                all_data[key] = value

        

        # 添加 session 中的 branch_rno
        if branch_rno is not None and "branch_rno" in valid_columns:
            all_data['branch_rno'] = branch_rno

        # 过滤无效字段
        visit_data = {k: v for k, v in all_data.items() if k in valid_columns}

        # 数据类型转换（改进版）
        for col, val in list(visit_data.items()):
            col_type = table_columns[col].lower()
            
            if val == "" or val is None:
                visit_data[col] = None
            elif col_type in ('datetime', 'datetime2', 'smalldatetime'):
                # datetime 字段保持字符串格式，让 SQL Server 自动转换
                if isinstance(val, str):
                    visit_data[col] = val  # 保持字符串
                else:
                    # 如果是 datetime 对象，转为字符串
                    visit_data[col] = val.strftime('%Y-%m-%d %H:%M:%S') if hasattr(val, 'strftime') else str(val)
            elif col_type in ('int', 'bigint', 'smallint', 'tinyint'):
                try:
                    visit_data[col] = int(val)
                except (ValueError, TypeError):
                    
                    visit_data[col] = None
            elif col_type in ('decimal', 'numeric', 'float', 'real', 'money'):
                try:
                    visit_data[col] = float(val)
                except (ValueError, TypeError):
                    
                    visit_data[col] = None
            elif col_type == 'bit':
                visit_data[col] = 1 if str(val).lower() in ('on', 'true', '1', 'yes') else 0

        # 调试打印最终数据
        print("Final visit_data:", visit_data)
        print("Types:", {k: type(v).__name__ for k, v in visit_data.items()})

        # 构建并执行SQL（尝试使用 ? 占位符，这对 SQL Server 更兼容）
        columns_sql = ', '.join(f'[{col}]' for col in visit_data.keys())
        
        # 根据数据库驱动选择占位符
        # 如果是 pyodbc，使用 ?；如果是其他，使用 %s
        try:
            # 先尝试 ? 占位符（SQL Server 标准）
            placeholders = ', '.join(['?'] * len(visit_data))
            sql = f"INSERT INTO [groupclinic].[Clinics].[visits] ({columns_sql},status) VALUES ({placeholders},'IN')"
            values = list(visit_data.values())
            
            print(f"Trying SQL with ? placeholders: {sql}")
            print(f"Values: {values}")
            
            with connections['cloudmssql'].cursor() as cursor:
                cursor.execute(sql, values)
                
        except Exception as e1:
            print(f"? placeholder failed: {e1}")
            # 如果 ? 失败，尝试 %s 占位符
            try:
                placeholders = ', '.join(['%s'] * len(visit_data))
                sql = f"INSERT INTO [groupclinic].[Clinics].[visits] ({columns_sql},status) VALUES ({placeholders},'IN')"
                
                print(f"Trying SQL with %s placeholders: {sql}")
                
                with connections['cloudmssql'].cursor() as cursor:
                    cursor.execute(sql, values)
                    
            except Exception as e2:
                print(f"%s placeholder also failed: {e2}")
                raise e2

        return JsonResponse({
            'success': True,
            'message': 'Registration submitted successfully',
            'saved_fields': list(visit_data.keys()),
        })

    except Exception as e:
        import traceback
        print(f"=== ERROR DETAILS ===")
        print(f"Error: {e}")
        print(f"Error Type: {type(e).__name__}")
        print(f"Traceback: {traceback.format_exc()}")
        
        return JsonResponse({
            'error': str(e),
            'type': type(e).__name__,
        }, status=500)
    
@api_view(['GET'])
def get_latest_visit(request):
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')

    if not start_date or not end_date:
        return Response({"error": "start_date 和 end_date 为必填参数"}, status=400)

    try:
        # 起始时间设置为 00:00:00
        start_date = datetime.strptime(start_date, '%Y-%m-%d')
        start_datetime = start_date.replace(hour=00, minute=00, second=00)

        # 结束时间设置为 23:59:59
        end_date = datetime.strptime(end_date, '%Y-%m-%d')
        end_datetime = end_date.replace(hour=23, minute=59, second=59)

    except ValueError:
        return Response({"error": "日期格式应为 YYYY-MM-DD"}, status=400)

    query = """
        SELECT TOP 1 queuno
        FROM [Clinics].[visits]
        WHERE visitdate >= %s 
        AND visitdate <= %s
        ORDER BY queuno ASC
    """
 
    with connections['cloudmssql'].cursor() as cursor:
        cursor.execute(query, [start_datetime, end_datetime])
        row = cursor.fetchone()
    print(start_datetime,end_datetime)
    return Response({"latest_queuno": row[0] if row else None})

@csrf_exempt
@require_http_methods(["POST"])
def save_table_order(request):
    try:
        # 解析JSON資料
        data = json.loads(request.body.decode("utf-8"))
        gridname = data.get('gridname')
        column_order = data.get('column_order')
        column_visible = data.get('column_visible')

        # 驗證必要欄位
        if not gridname:
            return JsonResponse({'success': False, 'error': '缺少gridname參數'}, status=400)
        if not column_order:
            return JsonResponse({'success': False, 'error': '缺少column_order參數'}, status=400)

        # 獲取session資料並驗證
        branch_rno = request.session.get('branch_rno')
        username = request.session.get('username')
        if not branch_rno:
            return JsonResponse({'success': False, 'error': '用戶未登錄或session已過期'}, status=401)

        # 固定UserID
        UserID = '1'

        with transaction.atomic():
            connection = connections['cloudmssql']
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT gridname FROM [dbo].[table_layout] 
                    WHERE gridname = %s AND branch_rno = %s AND UserID = %s
                """, [gridname, branch_rno, UserID])

                existing_record = cursor.fetchone()

                if existing_record:
                    cursor.execute("""
                        UPDATE [dbo].[table_layout]
                        SET columnposition = %s , columnvisible = %s
                        WHERE gridname = %s AND branch_rno = %s AND UserID = %s
                    """, [column_order, column_visible, gridname, branch_rno, UserID])
                    action = "更新"
                    logger.info(f"Updated table layout for gridname: {gridname}, user: {username}")
                else:
                    cursor.execute("""
                        INSERT INTO [dbo].[table_layout]
                        (branch_rno, UserID, gridname, columnposition, columnvisible, UserName)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """, [branch_rno, UserID, gridname, column_order, column_visible, username])
                    action = "新增"
                    logger.info(f"Created new table layout for gridname: {gridname}, user: {username}")

        return JsonResponse({'success': True, 'message': f'表格順序{action}成功', 'gridname': gridname})

    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {str(e)}")
        return JsonResponse({'success': False, 'error': 'JSON格式錯誤'}, status=400)

    except Exception as e:
        logger.error(f"Database error in save_table_order: {str(e)}")
        return JsonResponse({'success': False, 'error': f'資料庫操作失敗: {str(e)}'}, status=500)

import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import connections, transaction, DatabaseError

@csrf_exempt
@require_http_methods(["POST"])
def delete_table_order(request):
    try:
        data = json.loads(request.body.decode("utf-8"))
        branch_rno = request.session.get('branch_rno')
        UserID = '1'  
        gridname = data.get('gridname')

        if not branch_rno or not gridname:
            return JsonResponse({"success": False, "message": "缺少必要參數"}, status=400)

        with transaction.atomic():
            connection = connections['cloudmssql']
            with connection.cursor() as cursor:
                cursor.execute("""
                    DELETE FROM [dbo].[table_layout]
                    WHERE branch_rno = %s AND UserID = %s AND gridname = %s
                """, [branch_rno, UserID, gridname])

        return JsonResponse({"success": True, "message": "刪除成功"})

    except DatabaseError as e:
        return JsonResponse({"success": False, "message": f"資料庫錯誤: {str(e)}"}, status=500)
    except Exception as e:
        return JsonResponse({"success": False, "message": f"伺服器錯誤: {str(e)}"}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_table_order(request):
    """從 MSSQL 獲取表格欄位順序"""
    try:
        branch_rno = request.session.get('branch_rno')
        UserID = request.session.get('userid')
        gridname = request.GET.get("gridname")

        if not branch_rno:
            return JsonResponse({"success": False, "message": "缺少 branch_rno"}, status=400)

        with transaction.atomic():
            connection = connections['cloudmssql']
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT columnposition , columnvisible
                    FROM [dbo].[table_layout] 
                    WHERE gridname = %s AND branch_rno = %s AND UserID = %s
                """, [gridname, branch_rno, UserID])
                row = cursor.fetchone()

        if row and row[0]:
            return JsonResponse({
                "success": True,
                "order": row[0],  # 直接回傳 JSON 字串
                "visible": row[1]
            })
        else:
            # 沒有找到記錄，回傳空的 order
            return JsonResponse({
                "success": False, 
                "message": "找不到對應的紀錄，將使用預設順序"
            })

    except DatabaseError as e:
        print(f"資料庫錯誤: {str(e)}")
        return JsonResponse({"success": False, "message": f"資料庫錯誤: {str(e)}"}, status=500)
    except Exception as e:
        print(f"伺服器錯誤: {str(e)}")
        return JsonResponse({"success": False, "message": f"伺服器錯誤: {str(e)}"}, status=500)
    


from django.db import connections
import base64
from rest_framework import serializers
from django.shortcuts import render

def send_to_queue_details(request, customer_rno):
    branch_rno = request.session.get('branch_rno')

    sql = """
    SELECT 
        c.customer_rno,
        c.title,
        c.name,
        p.pcompanyname,
        p.panelcomp_rno,
        b.billtype,
        c.photo
    FROM [Inventory].[customers] c
    LEFT JOIN [Clinics].[billtype] b
        ON c.patient_corpbilltype = b.billtype_rno
    LEFT JOIN [Clinics].[panelcompany] p
        ON c.panelcomp_rno = p.panelcomp_rno
    WHERE c.branch_rno = %s AND c.customer_rno = %s
    """

    with connections['cloudmssql'].cursor() as cursor:
        cursor.execute(sql, [branch_rno, customer_rno])
        rows = cursor.fetchall()
        columns = [col[0] for col in cursor.description]

    data = []
    for row in rows:
        item = dict(zip(columns, row))
        data.append(item)

    serializer = sentoqueuedetail(data, many=True)
    return render(request, "pages/sendtoqueue.html", {
        'data': serializer.data,
        'count': len(serializer.data),
    })
