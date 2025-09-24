from django.shortcuts import render
from django.template import TemplateDoesNotExist
from django.db.models import Q
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, Http404
from django.db.models import OuterRef, Subquery, Q
from .models import Customer
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.apps import apps
from django.core import serializers
from django.forms.models import model_to_dict
from datetime import datetime, time

from .serializers import CustomerSerializer, ViewCustomerDetail
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework import status
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.db.models import Q
from .models import Customer
from .serializers import CustomerSerializer
import math
# Create your views here.



def dashboard(request):
    request.session['is_logged_in'] = True
    request.session['username'] = 'admin'
    request.session['branch_rno'] = 5
    request.session['editname'] = 'superadmin'
    request.session['userid'] = 1

    branch_rno = request.session['branch_rno']

    group_id = ""
    with connections['cloudmssql'].cursor() as cursor:
        cursor.execute("""
            SELECT TOP 1 gc_rno
            FROM [Clinics].[GroupClinicList]
            WHERE branch_rno = %s
        """, [branch_rno])
        row = cursor.fetchone()
        if row:
            group_id = row[0]  # 帶出 gc_rno

    request.session['group'] = group_id

    return JsonResponse({
        "status": "session 已设置",
        "group": request.session['group'],
        "branch_rno": request.session['branch_rno']
    })


@login_required
def root_page_view(request):
    branch_rno = request.session.get('branch_rno')
    gc_rno = request.session.get('group')  # 获取 group 信息
    try:
        connection = connections['cloudmssql']
        if gc_rno:
            # 如果有 group，使用 GroupClinicList 的查询逻辑
            sql = """
            SELECT 
                b.branchname as branch_name,
                b.branch_rno as branch_rno
            FROM [Inventory].branch b
            INNER JOIN [Clinics].[GroupClinicList] gl ON b.branch_rno = gl.branch_rno
            WHERE gl.gc_rno = %s
            """
            params = [gc_rno]
        else:
            # 如果没有 group，使用原本的查询逻辑
            sql = """
            SELECT 
                branchname as branch_name,
                branch_rno as branch_rno
            FROM [Inventory].branch 
            WHERE branch_rno=%s
            """
            params = [branch_rno]

        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            columns = [col[0] for col in cursor.description]
            results = cursor.fetchall()
        
        # Process results
        branches = [dict(zip(columns, row)) for row in results]
        
        # 传递数据到模板
        return render(request, 'pages/index.html', {
                            'branches': branches,
                            'selected_branch': branch_rno
                        })

    except TemplateDoesNotExist:
        return render(request, 'pages/error-404.html')



@login_required
def dynamic_pages_view(request, template_name):
    try:
        return render(request, f'pages/{template_name}.html')
    except TemplateDoesNotExist:
        return render(request, f'pages/error-404.html')
    
@login_required
def itemmaster_dynamic_pages_view(request, template_name):
    try:
        return render(request, f'pages/itemmaster/{template_name}.html')
    except TemplateDoesNotExist:
        return render(request, f'pages/error-404.html')

@login_required
def corporate_dynamic_pages_view(request, template_name):
    try:
        return render(request, f'pages/corporate/{template_name}.html')
    except TemplateDoesNotExist:
        return render(request, f'pages/error-404.html')


class CustomPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100
    
@api_view(['GET'])
def Customer_list(request):
    branch_rno = request.session.get('branch_rno')
    gc_rno = request.session.get('group')  # 获取 group 信息

    try:
        # Get pagination parameters
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        search = request.GET.get('search', '').strip()
        filter_field = request.GET.get('filter_field', '').strip()
        page_size = min(page_size, 100)  # 限制最大页大小

        offset = (page - 1) * page_size  # OFFSET 的起始行号

        connection = connections['cloudmssql']

        # ======================
        # 构建搜索条件
        # ======================
        search_conditions = []
        search_params = []

        if search:
            if filter_field:
                # 特定字段搜索
                if filter_field == 'name':
                    search_conditions.append("c.name LIKE %s")
                    search_params.append(f"%{search}%")
                if filter_field == 'icno':
                    search_conditions.append("c.icno LIKE %s")
                    search_params.append(f"%{search}%")
                if filter_field == 'customerno':
                    search_conditions.append("c.customerno LIKE %s")
                    search_params.append(f"%{search}%")
                if filter_field == 'phone1':
                    search_conditions.append("c.phone1 LIKE %s")
                    search_params.append(f"%{search}%")
            

        search_condition_sql = " AND " + " AND ".join(search_conditions) if search_conditions else ""

        # ======================
        # SQL + 参数拼接部分
        # ======================
        if gc_rno:
            base_sql = """
                SELECT 
                    c.customerno,
                    c.customer_rno,
                    c.title,
                    c.patient_dateofbirth,
                    c.gender,
                    c.name,
                    c.icno,
                    c.inv_address1,
                    c.inv_address2,
                    c.inv_address3,
                    c.phone1,
                    c.photo,
                    b.branchname AS branch_name,
                    b.branch_rno AS branch_rno
                FROM [Inventory].[customers] c
                LEFT JOIN [Inventory].branch b ON c.branch_rno = b.branch_rno
                LEFT JOIN [Clinics].[GroupClinicList] gl ON c.branch_rno = gl.branch_rno
                WHERE gl.gc_rno = %s
                {search_condition}
                ORDER BY c.customer_rno ASC
                OFFSET %s ROWS FETCH NEXT %s ROWS ONLY
            """.format(search_condition=search_condition_sql)

            params = [gc_rno] + search_params + [offset, page_size]

            count_sql = """
                SELECT COUNT(*)
                FROM [Inventory].[customers] c
                LEFT JOIN [Inventory].branch b ON c.branch_rno = b.branch_rno
                LEFT JOIN [Clinics].[GroupClinicList] gl ON c.branch_rno = gl.branch_rno
                WHERE gl.gc_rno = %s
                {search_condition}
            """.format(search_condition=search_condition_sql)

            count_params = [gc_rno] + search_params

        else:
            base_sql = """
                SELECT 
                    c.customerno,
                    c.customer_rno,
                    c.title,
                    c.patient_dateofbirth,
                    c.gender,
                    c.name,
                    c.icno,
                    c.inv_address1,
                    c.inv_address2,
                    c.inv_address3,
                    c.phone1,
                    c.photo,
                    b.branchname AS branch_name,
                    b.branch_rno AS branch_rno
                FROM [Inventory].[customers] c
                LEFT JOIN [Inventory].branch b ON c.branch_rno = b.branch_rno
                WHERE b.branch_rno = %s
                {search_condition}
                ORDER BY c.customer_rno ASC
                OFFSET %s ROWS FETCH NEXT %s ROWS ONLY
            """.format(search_condition=search_condition_sql)

            params = [branch_rno] + search_params + [offset, page_size]

            count_sql = """
                SELECT COUNT(*)
                FROM [Inventory].[customers] c
                LEFT JOIN [Inventory].branch b ON c.branch_rno = b.branch_rno
                WHERE b.branch_rno = %s
                {search_condition}
            """.format(search_condition=search_condition_sql)

            count_params = [branch_rno] + search_params

        # ======================
        # Count 总数
        # ======================
        with connection.cursor() as cursor:
            cursor.execute(count_sql, count_params)
            total_count = cursor.fetchone()[0]

        total_pages = math.ceil(total_count / page_size) if total_count > 0 else 1
        page = max(1, min(page, total_pages))

        # ======================
        # Fetch 分页数据
        # ======================
        with connection.cursor() as cursor:
            cursor.execute(base_sql, params)
            columns = [col[0] for col in cursor.description]
            results = cursor.fetchall()

        customers_data = []
        for row in results:
            customer_dict = dict(zip(columns, row))
            if customer_dict['photo']:
                try:
                    customer_dict['photo'] = base64.b64encode(customer_dict['photo']).decode("utf-8")
                except:
                    customer_dict['photo'] = None
            else:
                customer_dict['photo'] = None
            customers_data.append(customer_dict)

        start_index = offset + 1 if total_count > 0 else 0
        end_index = min(offset + page_size, total_count)

        return Response({
            'success': True,
            'data': customers_data,
            'pagination': {
                'current_page': page,
                'page_size': page_size,
                'total_pages': total_pages,
                'total': total_count,
                'has_previous': page > 1,
                'has_next': page < total_pages,
                'previous_page': page - 1 if page > 1 else None,
                'next_page': page + 1 if page < total_pages else None,
                'start_index': start_index,
                'end_index': end_index
            },
            'search': search,
            'filter_field': filter_field,
            'query_type': 'group' if gc_rno else 'branch',
            'available_fields': [
                'branch_name', 'customerno', 'customer_rno', 'branch_rno',
                'title', 'patient_dateofbirth', 'gender', 'name', 'icno',
                'inv_address1', 'inv_address2', 'inv_address3', 'phone1', 'photo'
            ]
        })

    except ValueError as e:
        return Response({
            'success': False,
            'error': 'Invalid page or page_size parameter',
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e),
            'message': 'Failed to fetch customer data'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




@api_view(['GET'])
def view_customer_details(request, customer_rno):
    branch_rno = request.session.get('branch_rno')
    sql = """
    SELECT 
        c.*,
        s.state AS state_name,     
        co.description AS country_name, 
        p.pcompanyname,
        b.billtype
    FROM [Inventory].[customers] c
    LEFT JOIN [Einvoice].[statecode] s
        ON c.statecode COLLATE Chinese_PRC_CI_AS = s.code COLLATE Chinese_PRC_CI_AS
    LEFT JOIN [Einvoice].[countrycode] co
        ON c.country COLLATE Chinese_PRC_CI_AS = co.code COLLATE Chinese_PRC_CI_AS
    LEFT JOIN [Clinics].[billtype] b
        ON c.patient_corpbilltype = b.billtype_rno
    LEFT JOIN [Clinics].[panelcompany] p
        ON c.panelcomp_rno = p.panelcomp_rno
    WHERE c.branch_rno = %s 
      AND c.customer_rno = %s;
    """

    with connections['cloudmssql'].cursor() as cursor:
        cursor.execute(sql, [branch_rno, customer_rno])
        columns = [col[0] for col in cursor.description]
        rows = cursor.fetchall()

    # 转换为字典列表
    data = []
    for row in rows:
        row_dict = dict(zip(columns, row))

        # 处理 photo 字段，若存在且为 bytes，则进行 Base64 编码
        if 'photo' in row_dict and isinstance(row_dict['photo'], (bytes, bytearray)):
            row_dict['photo'] = base64.b64encode(row_dict['photo']).decode("utf-8")
        else:
            row_dict['photo'] = None

        data.append(row_dict)

    return Response({
        'data': data,
        'count': len(data)
    })




from .models import (
    Relationship,
    CustomerType,
    CustomerGroup,
    CustomerRace,
    
    CustomerOccupation,
    CustomerLanguage,
    CustomerReligion,
    CustomerDiscountLevel,
    CustomerMaritalStatus,
    CustomerCitizenship,
    CustomerBillingtype,
    CustomerTitle,
    CustomerState,
    CustomerCountry,
    department
)



def customer_form_select(request):
    branch_rno = request.session.get('branch_rno')
    relationship = Relationship.objects.using('cloudmssql').filter(branch_rno=branch_rno)
    type = CustomerType.objects.using('cloudmssql').filter(branch_rno=branch_rno)
    group = CustomerGroup.objects.using('cloudmssql').filter(branch_rno=branch_rno)
    race = CustomerRace.objects.using('cloudmssql').filter(branch_rno=branch_rno)
    occupation = CustomerOccupation.objects.using('cloudmssql').filter(branch_rno=branch_rno)
    language = CustomerLanguage.objects.using('cloudmssql').filter(branch_rno=branch_rno)
    religion = CustomerReligion.objects.using('cloudmssql').filter(branch_rno=branch_rno)
    discountlevel = CustomerDiscountLevel.objects.using('cloudmssql').filter(branch_rno=branch_rno)
    maritalstatus = CustomerMaritalStatus.objects.using('cloudmssql').filter(branch_rno=branch_rno)
    citizenship = CustomerCitizenship.objects.using('cloudmssql').all()
    billingtype = CustomerBillingtype.objects.using('cloudmssql').all()
    title = CustomerTitle.objects.using('cloudmssql').filter(branch_rno=branch_rno)
    state = CustomerState.objects.using('cloudmssql').all()
    country = CustomerCountry.objects.using('cloudmssql').all()
    departments = department.objects.using('cloudmssql').filter(branch_rno=branch_rno)

    return render(request, "pages/tables-datatables-columns.html", {
        "relationships": relationship,
        "types": type,
        "groups":group ,
        "reces":race ,
        "occupations": occupation,
        "religions": religion,
        "languages": language,
        "discountlevels": discountlevel,
        "maritalstatuses": maritalstatus,
        "citizenships": citizenship,
        "billingtypes": billingtype,
        "titles": title,
        "states": state,
        "countries": country,
        "departments": departments,
    })




import io
import base64
import json
import re
import uuid
import pyodbc
from datetime import datetime
from PIL import Image
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.db import transaction, connections





@login_required
@csrf_exempt
@require_http_methods(["POST"])
def save_customer(request):
    branch_rno = request.session.get('branch_rno')
    try:
        
        # 1. 取得普通欄位
        data = request.POST.dict()

        photo_file = request.FILES.get('photo')  # 新上传的文件
        photo_data = request.POST.get('photo')   # base64 或其他数据
        photo_bytes = None

        if photo_file:
            # 新上传的文件 - 使用你现有的逻辑
            img = Image.open(photo_file)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            output = io.BytesIO()
            img.save(output, format='JPEG')
            photo_bytes = output.getvalue()
            output.close()
            
        elif photo_data and len(photo_data) > 100:
            # 已有的照片数据 - 需要处理
            if isinstance(photo_data, str):
                # 如果是 base64 字符串
                import base64
                if photo_data.startswith('data:image'):
                    photo_data = photo_data.split(',')[1]
                
                try:
                    # 将 base64 转换为 bytes
                    photo_bytes = base64.b64decode(photo_data)
                except Exception as e:
                    print(f"Error decoding base64: {e}")
                    photo_bytes = None

        

        
        # Get customerno if provided in request
        customerno = data.get("customerno")  # <-- ensure the variable exists

        # If no customerno is given, auto-generate a new one
        if not customerno:
            with connections['cloudmssql'].cursor() as cursor:
                cursor.execute("""
                    SELECT TOP 1 customerno 
                    FROM [Inventory].[customers]
                    WHERE customerno LIKE 'YS-RN%%%%'
                    ORDER BY customerno DESC
                """)
                row = cursor.fetchone()
                if row and row[0]:
                    last_num = int(row[0].split('YS-RN')[-1])
                    new_num = last_num + 1
                else:
                    new_num = 1

                customerno = f"YS-RN{new_num:06d}"  # always assign



        
        # 3. 取得 customers 資料表欄位
        def get_table_columns():
            with connections['cloudmssql'].cursor() as cursor:
                cursor.execute("""
                    SELECT COLUMN_NAME, DATA_TYPE
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = 'Inventory'
                    AND TABLE_NAME = 'customers'
                """)
                return {row[0]: row[1] for row in cursor.fetchall()}  # {欄位名: 資料型態}

        table_columns = get_table_columns()
        valid_columns = set(table_columns.keys())

        # 4. 準備所有可能的資料
        all_data = {
            **data,
            'customerno':customerno,
            'customer_uid': str(uuid.uuid4()),
            'branch_rno': branch_rno,
            'createon': timezone.now(),
            'createdby': 'tey soon hong',
            'photo': photo_bytes
            
        }

        # 5. 過濾無效欄位
        customer_data = {k: v for k, v in all_data.items() if k in valid_columns}

        if not customer_data:
            return JsonResponse({'error': '沒有有效的資料欄位'}, status=400)
        
        # >>> Add BIT defaults here <<<

        if 'accountstatus' not in customer_data:
            customer_data['accountstatus'] = 0
        if 'isforeigner' not in customer_data:
            customer_data['isforeigner'] = 0
        ic_number = customer_data.get('icno')
        if ic_number:
            with connections['cloudmssql'].cursor() as cursor:
                cursor.execute("""
                    SELECT COUNT(*) FROM [Inventory].[customers] WHERE icno = %s
                """, [ic_number])
                exists = cursor.fetchone()[0]
                if exists > 0:
                    return JsonResponse({
                        'error': f'IC Number {ic_number} Existed User'
                    }, status=400)


        # 6. SQL Server 資料型態轉換
        for col, val in customer_data.items():
            col_type = table_columns[col].lower()
            if val == "" or val is None:
                customer_data[col] = None
            elif col_type == 'bit':
                # 转成 0/1
                if str(val).lower() in ('on', 'true', '1', 'yes'):
                    customer_data[col] = 1
                else:
                    customer_data[col] = 0
            elif col_type in ('int', 'bigint', 'smallint', 'tinyint', 'decimal', 'numeric', 'float', 'real'):
                try:
                    customer_data[col] = float(val) if col_type in ('decimal', 'numeric', 'float', 'real') else int(val)
                except (ValueError, TypeError):
                    raise ValueError(f"欄位 {col} 需要數值型態，但收到的值是: {val}")

        # 7. 建立 SQL
        columns_sql = ', '.join(f'[{col}]' for col in customer_data.keys())
        placeholders = ', '.join(['%s'] * len(customer_data))
        sql = f"INSERT INTO [Inventory].[customers] ({columns_sql}) VALUES ({placeholders})"
        values = list(customer_data.values())

        # 8. 執行 SQL
        with connections['cloudmssql'].cursor() as cursor:
            cursor.execute(sql, values)

        ignored_fields = set(all_data.keys()) - valid_columns

        return JsonResponse({
            'success': True,
            'customer_no': data.get('customerno', ''),
            'saved_fields': list(customer_data.keys()),
            'ignored_fields': list(ignored_fields) if ignored_fields else []
        })

    except Exception as e:
        return JsonResponse({
            'error': str(e),
            'type': type(e).__name__,
        }, status=500)
    
@csrf_exempt
@require_http_methods(["POST"])
@login_required  # 如果需要登入驗證的話
def delete_customer(request):
    
    
    """Delete customer data from MSSQL database using raw SQL"""
    try:
        # 從 POST 請求中提取數據
        branch_rno = request.POST.get('branch_rno', '').strip()
        customer_rno = request.POST.get('customer_rno', '').strip()

        
        # 驗證必填字段
        if not customer_rno:
            return JsonResponse({
                'success': False,
                'error': 'Customer number is required'
            })
        
        if not branch_rno:
            return JsonResponse({
                'success': False,
                'error': 'Branch number is required'
            })
        
        # 使用原生 SQL 刪除資料
        with transaction.atomic(using='cloudmssql'):
            cursor = connections['cloudmssql'].cursor()
            try:
                # 首先檢查客戶是否存在
                cursor.execute("""
                    SELECT COUNT(*) FROM [Inventory].[customers] 
                    WHERE customer_rno = %s AND branch_rno = %s
                """, [customer_rno, branch_rno])
                
                if cursor.fetchone()[0] == 0:
                    return JsonResponse({
                        'success': False,
                        'error': 'Customer not found'
                    })
                
                # 執行刪除操作
                cursor.execute("""
                    DELETE FROM [Inventory].[customers] 
                    WHERE customer_rno = %s AND branch_rno = %s
                """, [customer_rno, branch_rno])
                
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
            'message': f'Customer {customer_rno} deleted successfully',
            'rows_affected': rows_affected
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Database error: {str(e)}'
        })


@login_required
@csrf_exempt
@require_http_methods(["POST"])
def update_customer(request):
    try:
        # 1. 取得原始資料（保證是 dict）
        data = request.POST.dict()

        branch_rno = data.get('branch_rno', '').strip()
        customer_rno = data.get('customer_rno', '').strip()

        # 2. 处理图片 - 只在明确标记为更改时才处理
        photo_file = request.FILES.get('photo')
        photo_changed = data.get('photo_changed', 'false').lower() == 'true'
        photo_bytes = None
        has_photo_update = False
        
        if photo_file and photo_changed:
            # ✅ 只有在照片确实改变时才处理
            img = Image.open(photo_file)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            output = io.BytesIO()
            img.save(output, format='JPEG')
            photo_bytes = output.getvalue()
            output.close()
            has_photo_update = True
            print(f"Processing changed photo file, size: {len(photo_bytes)} bytes")
        elif photo_changed and not photo_file:
            # ✅ 照片被删除的情况
            photo_bytes = None
            has_photo_update = True
            print("Photo was removed")
        else:
            print("Photo not changed, keeping original data")

        if not branch_rno or not customer_rno:
            return JsonResponse({
                'success': False,
                'error': 'Branch number and customer number are required'
            }, status=400)

        # 3. 查詢 customers 表的欄位
        def get_table_columns():
            with connections['cloudmssql'].cursor() as cursor:
                cursor.execute("""
                    SELECT COLUMN_NAME, DATA_TYPE
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = 'Inventory'
                    AND TABLE_NAME = 'customers'
                """)
                return {row[0]: row[1] for row in cursor.fetchall()}

        table_columns = get_table_columns()
        valid_columns = set(table_columns.keys())

        # 4. 過濾資料，只保留存在於資料表的欄位（排除系统字段）
        update_data = {
            k: v for k, v in data.items()
            if k in valid_columns and k not in ['customer_rno', 'branch_rno', 'photo_changed']  # ✅ 排除控制字段
        }

        # 5. 加入系統欄位
        update_data['modifyon'] = timezone.now()
        update_data['modifiedby'] = "soonhong"
        
        # ✅ 修改：只有在照片确实改变时才更新 photo 字段
        if has_photo_update:
            update_data['photo'] = photo_bytes  # 可能是 None（删除照片）或新的 bytes 数据

        # 6. SQL Server 資料型態轉換
        for col, val in update_data.items():
            col_type = table_columns[col].lower()
            if val == "" or val is None:
                update_data[col] = None
            elif col_type == 'bit':
                # 处理 bit 类型字段
                if str(val).lower() in ('on', 'true', '1', 'yes'):
                    update_data[col] = 1
                else:
                    update_data[col] = 0
            elif col_type in ('int', 'bigint', 'smallint', 'tinyint', 'decimal', 'numeric', 'float', 'real'):
                try:
                    update_data[col] = float(val) if col_type in ('decimal', 'numeric', 'float', 'real') else int(val)
                except (ValueError, TypeError):
                    raise ValueError(f"欄位 {col} 需要數值型態，但收到的值是: {val}")
                
        # 7. 设置默认值（只有在字段存在时才设置）
        if 'accountstatus' not in update_data:
            update_data['accountstatus'] = 0
        if 'isforeigner' not in update_data:
            update_data['isforeigner'] = 0
            
        # 8. 检查 IC 号码重复
        ic_number = update_data.get('icno')
        if ic_number:
            with connections['cloudmssql'].cursor() as cursor:
                cursor.execute("""
                    SELECT COUNT(*) 
                    FROM [Inventory].[customers] 
                    WHERE icno = %s AND customer_rno != %s
                """, [ic_number, customer_rno])

                exists = cursor.fetchone()[0]
                if exists > 0:
                    return JsonResponse({
                        'error': f'IC Number {ic_number} Existed User'
                    }, status=400)

        # 9. 动态生成 UPDATE 语句
        if not update_data:
            return JsonResponse({
                'success': False,
                'error': 'No data to update'
            })
            
        set_clause = ', '.join(f'[{col}] = %s' for col in update_data.keys())
        sql = f"""
            UPDATE [Inventory].[customers]
            SET {set_clause}
            WHERE customer_rno = %s AND branch_rno = %s
        """
        values = list(update_data.values()) + [customer_rno, branch_rno]

        # 10. 执行更新
        with connections['cloudmssql'].cursor() as cursor:
            cursor.execute(sql, values)
            rows_affected = cursor.rowcount

        if rows_affected == 0:
            return JsonResponse({
                'success': False,
                'error': 'No records were updated. Please check if the customer exists or if values are unchanged.'
            })

        return JsonResponse({
            'success': True,
            'message': f'Customer {customer_rno} updated successfully',
            'rows_affected': rows_affected,
            'photo_updated': has_photo_update  # ✅ 修改：返回是否处理了照片
        })

    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error: {str(e)}',
            'type': type(e).__name__
        }, status=500)

@api_view(['GET'])

def today_customer_count(request):
    """
    API endpoint to get count of customers added today
    GET /api/customers/today-count/
    """
    try:
        # Get today's date range
        today = timezone.now().date()
        start_of_day = timezone.make_aware(datetime.combine(today, time.min))
        end_of_day = timezone.make_aware(datetime.combine(today, time.max))
        
        # Count customers created today
        # Note: using raw SQL due to custom table schema
        from django.db import connection
        connection=connections['cloudmssql']
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) 
                FROM [Inventory].[customers] 
                WHERE [createon] >= %s AND [createon] <= %s
            """, [start_of_day, end_of_day])
            count = cursor.fetchone()[0]
        
        return Response({
            'count': count,
            'date': today.strftime('%Y-%m-%d'),
            'success': True
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': str(e),
            'count': 0,
            'success': False
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])

def today_customer_list(request):
    """
    API endpoint to get list of customers added today
    GET /api/customers/today-list/
    Query parameters:
    - page: page number (default: 1)
    - page_size: items per page (default: 20)
    - search: search term for name/customer number
    """
    try:
        # Get today's date range
        today = timezone.now().date()
        start_of_day = timezone.make_aware(datetime.combine(today, time.min))
        end_of_day = timezone.make_aware(datetime.combine(today, time.max))
        
        # Get today's customers using raw SQL due to custom table schema
        from django.db import connection
        
        search_term = request.GET.get('search', '').strip()
        page = int(request.GET.get('page', 1))
        page_size = min(int(request.GET.get('page_size', 20)), 100)
        offset = (page - 1) * page_size
        
        # Build the SQL query
        base_sql = """
            SELECT [customer_rno], [customer_uid], [customerno], [name], 
                   [phone1], [mobileno1], [phone2], [mobileno2], [email],
                   [createon], [createdby], [address], [inv_address1], 
                   [icno], [gender], [patient_age], [isforeigner], [branch_uid]
            FROM [Inventory].[customers] 
            WHERE [createon] >= %s AND [createon] <= %s
        """
        
        count_sql = """
            SELECT COUNT(*) 
            FROM [Inventory].[customers] 
            WHERE [createon] >= %s AND [createon] <= %s
        """
        
        params = [start_of_day, end_of_day]
        
        # Add search conditions if provided
        if search_term:
            search_condition = """
                AND ([name] LIKE %s OR [customerno] LIKE %s 
                     OR [phone1] LIKE %s OR [mobileno1] LIKE %s)
            """
            base_sql += search_condition
            count_sql += search_condition
            
            search_param = f'%{search_term}%'
            params.extend([search_param, search_param, search_param, search_param])
        
        # Add ordering and pagination
        base_sql += " ORDER BY [createon] DESC OFFSET %s ROWS FETCH NEXT %s ROWS ONLY"
        connection=connections['cloudmssql']
        with connection.cursor() as cursor:
            # Get total count
            cursor.execute(count_sql, params)
            total_count = cursor.fetchone()[0]
            
            # Get paginated results
            cursor.execute(base_sql, params + [offset, page_size])
            columns = [col[0] for col in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        # Calculate pagination info
        total_pages = (total_count + page_size - 1) // page_size
        has_next = page < total_pages
        has_previous = page > 1
        
        # Format the results
        customers = []
        for row in results:
            # Format creation time
            created_time = row['createon'].strftime('%H:%M') if row['createon'] else 'Unknown'
            created_datetime = row['createon'].strftime('%Y-%m-%d %H:%M:%S') if row['createon'] else None
            
            # Get primary phone number
            phone = row['phone1'] or row['mobileno1'] or row['phone2'] or row['mobileno2']
            
            customers.append({
                'id': row['customer_rno'],
                'customer_uid': str(row['customer_uid']) if row['customer_uid'] else None,
                'customer_no': row['customerno'] or 'N/A',
                'name': row['name'] or 'No Name',
                'phone': phone,
                'email': row['email'],
                'created_time': created_time,
                'created_datetime': created_datetime,
                'created_by': row['createdby'],
                'address': row['address'] or row['inv_address1'],
                'ic_no': row['icno'],
                'gender': row['gender'],
                'age': row['patient_age'],
                'is_foreigner': bool(row['isforeigner']) if row['isforeigner'] is not None else False,
                'branch_uid': row['branch_uid']
            })
        
        return Response({
            'customers': customers,
            'pagination': {
                'current_page': page,
                'total_pages': total_pages,
                'total_count': total_count,
                'has_next': has_next,
                'has_previous': has_previous,
                'page_size': page_size
            },
            'search_term': search_term,
            'date': today.strftime('%Y-%m-%d'),
            'success': True
        }, status=status.HTTP_200_OK)
        
    except ValueError as e:
        return Response({
            'error': 'Invalid page or page_size parameter',
            'customers': [],
            'success': False
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({
            'error': str(e),
            'customers': [],
            'success': False
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])

def today_customer_stats(request):
    """
    API endpoint to get detailed statistics of today's customers
    GET /api/customers/today-stats/
    """
    try:
        # Get today's date range
        today = timezone.now().date()
        start_of_day = timezone.make_aware(datetime.combine(today, time.min))
        end_of_day = timezone.make_aware(datetime.combine(today, time.max))
        
        # Get statistics using raw SQL
        from django.db import connection
        connection=connections['cloudmssql']
        with connection.cursor() as cursor:
            # Get total count
            cursor.execute("""
                SELECT COUNT(*) 
                FROM [Inventory].[customers] 
                WHERE [createon] >= %s AND [createon] <= %s
            """, [start_of_day, end_of_day])
            total_count = cursor.fetchone()[0]
            
            # Get gender distribution
            cursor.execute("""
                SELECT [gender], COUNT(*) as count
                FROM [Inventory].[customers] 
                WHERE [createon] >= %s AND [createon] <= %s
                AND [gender] IS NOT NULL
                GROUP BY [gender]
            """, [start_of_day, end_of_day])
            gender_results = cursor.fetchall()
            
            # Get hourly distribution
            cursor.execute("""
                SELECT DATEPART(HOUR, [createon]) as hour, COUNT(*) as count
                FROM [Inventory].[customers] 
                WHERE [createon] >= %s AND [createon] <= %s
                GROUP BY DATEPART(HOUR, [createon])
                ORDER BY hour
            """, [start_of_day, end_of_day])
            hourly_results = cursor.fetchall()
            
            # Get foreigner count
            cursor.execute("""
                SELECT [isforeigner], COUNT(*) as count
                FROM [Inventory].[customers] 
                WHERE [createon] >= %s AND [createon] <= %s
                GROUP BY [isforeigner]
            """, [start_of_day, end_of_day])
            foreigner_results = cursor.fetchall()
        
        # Process gender statistics
        gender_stats = {}
        for gender, count in gender_results:
            if gender:
                gender_key = 'Male' if gender.upper() in ['M', 'MALE'] else 'Female'
                gender_stats[gender_key] = gender_stats.get(gender_key, 0) + count
        
        # Process hourly statistics
        hourly_stats = {}
        for hour, count in hourly_results:
            hourly_stats[f"{hour:02d}:00"] = count
        
        # Process nationality statistics
        nationality_stats = {'Local': 0, 'Foreigner': 0}
        for is_foreigner, count in foreigner_results:
            if is_foreigner:
                nationality_stats['Foreigner'] = count
            else:
                nationality_stats['Local'] = count
        
        return Response({
            'total_count': total_count,
            'gender_distribution': gender_stats,
            'hourly_distribution': hourly_stats,
            'branch_distribution': {},  # Branch stats would need additional query
            'nationality': nationality_stats,
            'date': today.strftime('%Y-%m-%d'),
            'last_updated': timezone.now().isoformat(),
            'success': True
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': str(e),
            'success': False
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Alternative view without DRF (if you prefer function-based views)
@csrf_exempt
@require_http_methods(["GET"])
def today_customer_count_simple(request):
    """
    Simple Django view without DRF
    GET /api/customers/today-count-simple/
    """
    try:
        # Get today's date range
        today = timezone.now().date()
        start_of_day = timezone.make_aware(datetime.combine(today, time.min))
        end_of_day = timezone.make_aware(datetime.combine(today, time.max))
        
        # Count customers created today using raw SQL
        from django.db import connection
        connection=connections['cloudmssql']
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) 
                FROM [Inventory].[customers] 
                WHERE [createon] >= %s AND [createon] <= %s
            """, [start_of_day, end_of_day])
            count = cursor.fetchone()[0]
        
        return JsonResponse({
            'count': count,
            'date': today.strftime('%Y-%m-%d'),
            'success': True
        })
        
    except Exception as e:
        return JsonResponse({
            'error': str(e),
            'count': 0,
            'success': False
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def today_customer_list_simple(request):
    """
    Simple Django view without DRF
    GET /api/customers/today-list-simple/
    """
    try:
        # Get today's date range
        today = timezone.now().date()
        start_of_day = timezone.make_aware(datetime.combine(today, time.min))
        end_of_day = timezone.make_aware(datetime.combine(today, time.max))
        
        # Get today's customers using raw SQL
        from django.db import connection
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT TOP 20 [customer_rno], [customerno], [name], 
                       [phone1], [mobileno1], [phone2], [mobileno2], 
                       [createon], [createdby]
                FROM [Inventory].[customers] 
                WHERE [createon] >= %s AND [createon] <= %s
                ORDER BY [createon] DESC
            """, [start_of_day, end_of_day])
            
            columns = [col[0] for col in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        # Serialize data
        customers = []
        for row in results:
            created_time = row['createon'].strftime('%H:%M') if row['createon'] else 'Unknown'
            phone = row['phone1'] or row['mobileno1'] or row['phone2'] or row['mobileno2']
            
            customers.append({
                'id': row['customer_rno'],
                'customer_no': row['customerno'] or 'N/A',
                'name': row['name'] or 'No Name',
                'phone': phone,
                'created_time': created_time,
                'created_by': row['createdby']
            })
        
        return JsonResponse({
            'customers': customers,
            'count': len(customers),
            'date': today.strftime('%Y-%m-%d'),
            'success': True
        })
        
    except Exception as e:
        return JsonResponse({
            'error': str(e),
            'customers': [],
            'success': False
        }, status=500)
    


@api_view(['GET'])
def customer_panel_company(request):
    branch_rno = request.session.get('branch_rno')
    customer_rno = request.query_params.get('customer_rno')  # 从 URL ?customer_rno=xxx 获取

    if not branch_rno:
        return Response({"error": "No branch_rno in session"}, status=400)
    if not customer_rno:
        return Response({"error": "Missing customer_rno in request"}, status=400)

    sql = """
    SELECT p.panelcomp_rno, p.pcompanyname
    FROM [clinics].[panelcompany] p
    LEFT JOIN [inventory].[branch] b
        ON p.privatebranch_rno = b.branch_rno
    LEFT JOIN [inventory].[customers] c
        ON p.panelcomp_rno = c.panelcomp_rno
    WHERE p.privatebranch_rno = %s
    AND c.customer_rno = %s
    """

    connection = connections['cloudmssql']
    with connection.cursor() as cursor:
        cursor.execute(sql, [branch_rno, customer_rno])
        columns = [col[0] for col in cursor.description]
        data = [dict(zip(columns, row)) for row in cursor.fetchall()]

    return Response(data)



@api_view(['GET'])
def panel_company_list(request):
    branch_rno = request.session.get('branch_rno')
    if not branch_rno:
        return Response({"error": "No branch_rno in session"}, status=400)

    # 获取搜索参数
    pcompany_no = request.GET.get('pcompany_no', '').strip()
    pcompanyname = request.GET.get('pcompanyname', '').strip()

    # 分页参数
    try:
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
    except ValueError:
        return Response({"error": "Invalid page or page_size"}, status=400)

    offset = (page - 1) * page_size

    # 基础 SQL
    sql = """
    SELECT p.panelcomp_rno, p.pcompanyname, p.pcompany_no, b.branchname
    FROM clinics.panelcompany p
    LEFT JOIN inventory.branch b
        ON p.privatebranch_rno = b.branch_rno
    WHERE p.privatebranch_rno = %s
    """
    params = [branch_rno]

    # 动态拼接条件
    if pcompany_no:
        sql += " AND p.pcompany_no LIKE %s"
        params.append(f"%{pcompany_no}%")
    if pcompanyname:
        sql += " AND p.pcompanyname LIKE %s"
        params.append(f"%{pcompanyname}%")

    # 排序并分页
    

    connection = connections['cloudmssql']
    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        columns = [col[0] for col in cursor.description]
        data = [dict(zip(columns, row)) for row in cursor.fetchall()]

    # 获取总数（不分页）
    count_sql = """
    SELECT COUNT(*)
    FROM clinics.panelcompany p
    LEFT JOIN inventory.branch b
        ON p.privatebranch_rno = b.branch_rno
    WHERE p.privatebranch_rno = %s
    """
    count_params = [branch_rno]
    if pcompany_no:
        count_sql += " AND p.pcompany_no LIKE %s"
        count_params.append(f"%{pcompany_no}%")
    if pcompanyname:
        count_sql += " AND p.pcompanyname LIKE %s"
        count_params.append(f"%{pcompanyname}%")

    with connection.cursor() as cursor:
        cursor.execute(count_sql, count_params)
        total = cursor.fetchone()[0]

    return Response({
        "data": data,
        "page": page,
        "page_size": page_size,
        "total": total,
    })


# 获取账单类型列表
@api_view(['GET'])
def billtype_list(request):
  
    billtypes = CustomerBillingtype.objects.using('cloudmssql')
    return Response({
        'billtypes': [{'billtype_rno': bt.billtype_rno, 'billtype': bt.billtype} for bt in billtypes]
    })




@require_http_methods(["POST"])
@csrf_exempt
@login_required  # 如果需要登入驗證的話
def security_code_check(request):
    branch_rno = request.session.get('branch_rno')

    try:
        # 解析请求体 JSON
        data = json.loads(request.body)
        code = data.get("code")

        if not code:
            return JsonResponse({
                'success': False,
                'message': 'Security code is required'
            }, status=400)

        connection = connections['cloudmssql']
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) 
                FROM [dbo].[SecurityCode] 
                WHERE SecurityCode = %s AND branch_rno = %s
            """, [code, branch_rno])

            row = cursor.fetchone()

            if not row or row[0] == 0:
                return JsonResponse({
                    'success': False,
                    'message': 'Invalid security code'
                }, status=401)

            # ✅ 成功验证
            return JsonResponse({
                'success': True,
                'message': 'Security code verified successfully'
            })

    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Database error: {str(e)}'
        }, status=500)
