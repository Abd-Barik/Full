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
from .models import Customer
from .serializers import  sentoqueuedetail
from math import ceil
from django.db import connection
from django.utils import timezone
import logging


logger = logging.getLogger(__name__)


@api_view(['GET'])
def service_item_list(request):
    """
    服务项目列表API - 支持DataTables服务器端分页
    """
    try:
        branch_rno = request.session.get('branch_rno')
        gc_rno = request.session.get('group')
        
        if not branch_rno:
            return Response({"error": "Branch not found in session"}, status=400)

        # DataTables分页参数
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        
        # 计算偏移量
        offset = (page - 1) * page_size

        # 表单过滤字段
        item_no = request.GET.get('itemno', '').strip()
        item_name = request.GET.get('itemname', '').strip()
        
        # DataTables搜索参数
        search = request.GET.get('search', '').strip()

        # 基础SQL查询
        base_sql = """
            SELECT 
                im.item_rno,
                im.itemno,
                im.itemname,
                im.alternateitemno,
                im.universalitemno as referenceno,
                im.isactive,
                im.salesunit as uom,
                im.salesprice as price,
                im.unitcost,
                im.labelprint,
                im.iscontroldrug as controldrug,
                im.istaxable as taxableiterm,
                im.taxrate,
                im.itemwithserial as serial_item,
                im.createdby,
                CONVERT(varchar, im.createdon, 23) as createdon,
                im.modifiedby,
                CONVERT(varchar, im.modifiedon, 23) as modifiedon,
                ISNULL(b.branchname, 'N/A') as branch,
                ISNULL(bg.billgrp_description, 'N/A') as billgroup
            FROM [groupclinic].[Inventory].[itemmaster] im
            LEFT JOIN [groupclinic].[Inventory].[branch] b 
                ON im.branch_rno = b.branch_rno
            LEFT JOIN [groupclinic].[Clinics].[billing_group] bg 
                ON im.billgrp_rno = bg.billgrp_rno
            WHERE im.mastertype = 'Service Items'
            AND im.branch_rno = %s
            AND im.isactive = 1
        """
        
        params = [branch_rno]

        # 表单过滤条件
        if item_no:
            base_sql += " AND im.itemno LIKE %s"
            params.append(f"%{item_no}%")

        if item_name:
            base_sql += " AND im.itemname LIKE %s"
            params.append(f"%{item_name}%")

        # DataTables全局搜索
        if search:
            base_sql += " AND (im.itemname LIKE %s OR im.itemno LIKE %s OR im.universalitemno LIKE %s)"
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param])

        # 查询总记录数
        count_sql = f"""
            SELECT COUNT(*) as total_count 
            FROM ({base_sql}) AS count_query
        """
        
        with connections['cloudmssql'].cursor() as cursor:
            cursor.execute(count_sql, params)
            result = cursor.fetchone()
            total_count = result[0] if result else 0

        # 添加排序和分页
        # DataTables排序参数处理
        order_column = request.GET.get('order_column', 'itemno')  # 默认按itemno排序
        order_dir = request.GET.get('order_dir', 'desc')  # 默认降序
        
        # 验证排序参数防止SQL注入
        valid_columns = {
            'itemno': 'im.itemno',
            'itemname': 'im.itemname', 
            'referenceno': 'im.universalitemno',
            'branch': 'b.branchname',
            'price': 'im.salesprice',
            'createdon': 'im.createdon'
        }
        
        order_column_sql = valid_columns.get(order_column, 'im.createdon')
        order_dir_sql = 'ASC' if order_dir.upper() == 'ASC' else 'DESC'
        
        base_sql += f" ORDER BY {order_column_sql} {order_dir_sql}"
        base_sql += " OFFSET %s ROWS FETCH NEXT %s ROWS ONLY"
        params.extend([offset, page_size])

        # 执行主查询
        with connections['cloudmssql'].cursor() as cursor:
            cursor.execute(base_sql, params)
            columns = [col[0] for col in cursor.description]
            items = []
            
            for row in cursor.fetchall():
                item_dict = dict(zip(columns, row))
                
                # 数据格式化
                if item_dict.get('price'):
                    item_dict['price'] = float(item_dict['price'])
                if item_dict.get('costprice'):
                    item_dict['costprice'] = float(item_dict['costprice'])
                if item_dict.get('taxrate'):
                    item_dict['taxrate'] = float(item_dict['taxrate'])
                    
                # 布尔值转换
                item_dict['isactive'] = bool(item_dict.get('isactive', False))
                item_dict['taxableiterm'] = bool(item_dict.get('taxableiterm', False))
                item_dict['labelprint'] = bool(item_dict.get('labelprint', False))
                
                items.append(item_dict)

        # 计算总页数
        total_pages = ceil(total_count / page_size) if total_count > 0 else 0

        # 返回DataTables兼容的响应格式
        response_data = {
            "page": page,
            "page_size": page_size,
            "total": total_count,
            "total_pages": total_pages,
            "results": items,
            # DataTables兼容字段
            "recordsTotal": total_count,
            "recordsFiltered": total_count,
            "data": items
        }

        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Service item list API error: {str(e)}")
        return Response({
            "error": "Internal server error",
            "message": str(e),
            "results": [],
            "total": 0,
            "recordsTotal": 0,
            "recordsFiltered": 0
        }, status=500)
    


from .models import ItemType,ItemGroup,ItemCategory,ItemBillGroup,ItemClassification,ItemTax
def service_item_master_select(request):
    branch_rno = request.session.get('branch_rno')
    itemtypes = ItemType.objects.using('cloudmssql').filter(branch_rno=branch_rno)
    itemgroups = ItemGroup.objects.using('cloudmssql').filter(branch_rno=branch_rno)
    itemcategories = ItemCategory.objects.using('cloudmssql').filter(branch_rno=branch_rno)
    itembillgroups = ItemBillGroup.objects.using('cloudmssql').filter(branch_rno=branch_rno)
    itemclassifications = ItemClassification.objects.using('cloudmssql').all()
    itemtax = ItemTax.objects.using('cloudmssql').all()

    return render(request, "pages/itemmaster/service_item_master_form.html", {
        "types": itemtypes,
        "groups": itemgroups,
        "categories":itemcategories ,
        "billgroups":itembillgroups ,
        "classifications": itemclassifications,
        "taxes": itemtax,
    })




@require_http_methods(["POST"])
def create_service_item(request):
    branch_rno = request.session.get('branch_rno')
    user = request.session.get('username')
    
    try:
        # Get form data
        data = {}
        for key, value in request.POST.items():
            if key != 'csrfmiddlewaretoken':
                data[key] = value
        
        # Convert string booleans to actual booleans
        boolean_fields = [
            'isactive', 'istaxable', 'labelprint', 'istaxinclusive'
        ]
        
        for field in boolean_fields:
            if field in data:
                data[field] = data[field].lower() in ['true', '1', 'on']
        
        # Convert numeric fields
        numeric_fields = [
            'salesprice', 'salesprice2', 'salesprice3', 'salesprice4', 'salesprice5', 'salesprice6',
            'x_salesprice', 'x_salesprice2', 'x_salesprice3', 'x_salesprice4', 'x_salesprice5', 'x_salesprice6'
        ]
        
        for field in numeric_fields:
            if field in data and data[field]:
                try:
                    data[field] = float(data[field]) if '.' in str(data[field]) else int(data[field])
                except (ValueError, TypeError):
                    data[field] = None

        # Get current timestamp
        current_time = timezone.now()
        
        # Prepare SQL insert statement
        connection = connections['cloudmssql']
        with connection.cursor() as cursor:
            # First, get the next item_rno (auto-increment simulation)
            cursor.execute("SELECT ISNULL(MAX(item_rno), 0) + 1 FROM [groupclinic].[Inventory].[itemmaster]")
            item_rno = cursor.fetchone()[0]
            
            # Build the service item insert query (only relevant fields)
            sql = """
            INSERT INTO [groupclinic].[Inventory].[itemmaster] 
            (branch_rno, itemno, itemname, barcode, itemtype, itemgroup, category_rno, 
             billgrp_rno, classificationcode, salesprice, salesprice2, salesprice3, salesprice4, 
             salesprice5, salesprice6, x_salesprice, x_salesprice2, x_salesprice3, x_salesprice4, 
             x_salesprice5, x_salesprice6, taxcode, isactive, istaxable, labelprint, istaxinclusive, 
             createdby, createdon, mastertype, itemstatus, isserviceitem)
            VALUES 
            (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 
             %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            def to_int(value, default=None):
                try:
                    return int(value) if value not in (None, '') else default
                except ValueError:
                    return default
                
            def to_float(value, default=None):
                try:
                    return float(value) if value not in (None, '') else default
                except ValueError:
                    return default

            # Generate item number if not provided
            generated_itemno = data.get('itemno') if data.get('itemno') else f'SVC{item_rno:06d}'

            # Prepare parameters for service items
            params = [
                
                branch_rno,
                generated_itemno,
                data.get('itemname'),
                data.get('barcode'),
                to_int(data.get('itemtype')),
                to_int(data.get('itemgroup')),
                to_int(data.get('category_rno')),
                to_int(data.get('billgrp_rno')),
                data.get('classificationcode'),
                to_float(data.get('salesprice')),
                to_float(data.get('salesprice2')),
                to_float(data.get('salesprice3')),
                to_float(data.get('salesprice4')),
                to_float(data.get('salesprice5')),
                to_float(data.get('salesprice6')),
                to_float(data.get('x_salesprice')),
                to_float(data.get('x_salesprice2')),
                to_float(data.get('x_salesprice3')),
                to_float(data.get('x_salesprice4')),
                to_float(data.get('x_salesprice5')),
                to_float(data.get('x_salesprice6')),
                data.get('taxcode'),
                data.get('isactive', True),
                data.get('istaxable', False),
                data.get('labelprint', True),
                data.get('istaxinclusive', False),
                user,
                current_time,
                'Service Items',  # mastertype for service items
                'Active',        # default itemstatus
                True            # isserviceitem = True for service items
            ]
            
            # Execute the insert
            cursor.execute(sql, params)
        
        return JsonResponse({
            'success': True,
            'message': 'Service item created successfully',
            'item_rno': item_rno,
            'itemno': generated_itemno,
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=400)

@csrf_exempt  
@require_http_methods(["GET"])
def get_service_item(request, item_rno):
    branch_rno = request.session.get('branch_rno')
    try:
        connection = connections['cloudmssql']
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT * FROM [groupclinic].[Inventory].[itemmaster] 
                WHERE item_rno = %s
                AND branch_rno = %s
            """, [item_rno,branch_rno])
            
            row = cursor.fetchone()
            if not row:
                return JsonResponse({
                    'success': False,
                    'message': 'Item not found'
                }, status=404)
            
            # Get column names
            columns = [col[0] for col in cursor.description]
            
            # Create dictionary from row data
            item_data = dict(zip(columns, row))
            
            # Convert datetime objects to strings
            for key, value in item_data.items():
                if hasattr(value, 'isoformat'):
                    item_data[key] = value.isoformat()
            
            return JsonResponse({
                'success': True,
                'data': item_data
            })
            
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=400)



@require_http_methods(["POST"])
def update_service_item(request, item_rno):
    user = request.session.get('username')
    """
    API endpoint to update an inventory item - only updates non-null/non-empty fields
    """
    try:
        # Parse JSON data from request body
        data = json.loads(request.body)
        
        # Define updatable fields with their types
        updatable_fields = {
            'itemname': str,
            'alternateitemno': str,
            'category_rno': int,
            'itemtype': str,
            'itemgroup': str,
            'supplier1_rno': int,
            'supplier2_rno': int,
            'supplier3_rno': int,
            'shelf': str,
            'unit': str,
            'unitcost': float,
            'unitsellprice': float,
            'openingqty': float,
            'maximum': float,
            'minimum': float,
            'reorder': float,
            'purchaseunit': str,
            'purchasefactor': float,
            'salesunit': str,
            'salesfactor': float,
            'barcode': str,
            'salesprice': float,
            'salesprice2': float,
            'salesprice3': float,
            'salesprice4': float,
            'salesprice5': float,
            'salesprice6': float,
            'purchaseprice': float,
            'billgrp_rno': int,
            'frequency': str,
            'dosage': str,
            'precaution': str,
            'indication': str,
            'instruction': str,
            'dose': str,
            'timeperday': int,
            'defaultexpiredate': int,
            'classificationcode': str,
            'taxcode': str,
            'x_salesprice': float,
            'x_salesprice2': float,
            'x_salesprice3': float,
            'x_salesprice4': float,
        }
        
        # Boolean fields
        boolean_fields = [
            'isactive', 'noexpirydateitem', 'istaxable', 'labelprint',
            'isvaccine', 'iscontroldrug', 'itemwithserial', 'istaxinclusive'
        ]
        
        # Build dynamic update query
        set_clauses = []
        params = []
        
        # Process regular fields - only update if value is not null/empty
        for field_name, field_type in updatable_fields.items():
            if field_name in data:
                value = data[field_name]
                
                # Skip if value is None, empty string, or whitespace only
                if value is not None and str(value).strip():
                    try:
                        # Convert to appropriate type
                        if field_type == int:
                            converted_value = int(float(value))
                        elif field_type == float:
                            converted_value = float(value)
                        else:  # str
                            converted_value = str(value).strip()
                        
                        set_clauses.append(f"{field_name} = %s")
                        params.append(converted_value)
                        
                    except (ValueError, TypeError):
                        # Skip invalid values
                        continue
        
        # Process boolean fields - only update if explicitly provided
        for field_name in boolean_fields:
            if field_name in data:
                value = data[field_name]
                bool_value = value if isinstance(value, bool) else str(value).lower() in ['true', '1', 'on']
                
                set_clauses.append(f"{field_name} = %s")
                params.append(bool_value)
        
        # If no fields to update, return error
        if not set_clauses:
            return JsonResponse({
                'success': False,
                'message': 'No valid fields to update'
            }, status=400)
        
        # Add modified timestamp and user
        set_clauses.append("modifiedon = %s")
        params.append(timezone.now())
        
        if request.user.is_authenticated:
            set_clauses.append("modifiedby = %s")
            params.append(user)
        
        # Add item_rno for WHERE clause
        params.append(item_rno)
        
        connection = connections['cloudmssql']
        cursor = connection.cursor()
        sql = f"""
            UPDATE [groupclinic].[Inventory].[itemmaster] 
            SET {', '.join(set_clauses)}
            WHERE item_rno = %s
        """
        cursor.execute(sql, params)

        if cursor.rowcount == 0:
            return JsonResponse({
                'success': False,
                'message': 'Item not found or no changes made'
            }, status=404)

        
        return JsonResponse({
            'success': True,
            'message': 'Item updated successfully'
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'message': 'Invalid JSON data'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error updating item: {str(e)}'
        }, status=500)
 
    
@require_http_methods(["POST"])
@csrf_exempt
@login_required
def delete_service_item(request):
    branch_rno = request.session.get('branch_rno')

    try:
        # 解析 request body
        data = json.loads(request.body.decode('utf-8'))
        item_rno = data.get('item_rno')
        print(item_rno)
        if not item_rno:
            return JsonResponse({
                'success': False,
                'message': 'Missing item_rno'
            }, status=400)

        connection = connections['cloudmssql']
        with connection.cursor() as cursor:
            cursor.execute("""
                DELETE FROM [Inventory].[itemmaster] 
                WHERE item_rno = %s 
                AND branch_rno = %s 
                AND mastertype = 'Service Items'
            """, [item_rno, branch_rno])

            if cursor.rowcount == 0:
                return JsonResponse({
                    'success': False,
                    'message': 'Item not found'
                }, status=404)

        return JsonResponse({
            'success': True,
            'message': f'Item {item_rno} deleted successfully'
        })

    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Database error: {str(e)}'
        }, status=500)

