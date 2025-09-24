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
from math import ceil

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import connection
from django.utils import timezone



@api_view(['GET'])
def item_list(request):
    try:
        branch_rno = request.session.get('branch_rno')
        gc_rno = request.session.get('group')

        # 分页参数
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        offset = (page - 1) * page_size

        # 表单过滤字段
        item_no = request.GET.get('itemno', '').strip()
        item_name = request.GET.get('itemname', '').strip()
        alter_item_no = request.GET.get('alternateitemno', '').strip()
        serial_item = request.GET.get('serial_item', '').strip()  # 0 or 1 expected

        # 搜索关键字（模糊搜索用）
        search = request.GET.get('search', '').strip()

        # 基础 SQL
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
                im.labelprint,
                im.iscontroldrug as controldrug,
                im.istaxable as taxableiterm,
                im.taxrate,
                im.itemwithserial as serial_item,
                im.createdby,
                im.createdon,
                im.modifiedby,
                im.modifiedon,
                b.branchname as branch,
                bg.billgrp_description as billgroup
            FROM [groupclinic].[Inventory].[itemmaster] im
            LEFT JOIN [groupclinic].[Inventory].[branch] b 
                ON im.branch_rno = b.branch_rno
            LEFT JOIN [groupclinic].[Clinics].[billing_group] bg 
                ON im.billgrp_rno = bg.billgrp_rno
            WHERE im.mastertype = 'Stock Items'
            AND im.branch_rno = %s
            AND im.isactive = 1
        """

        params = [branch_rno]

        # 动态表单过滤条件
        if item_no:
            base_sql += " AND im.itemno LIKE %s"
            params.append(f"%{item_no}%")

        if item_name:
            base_sql += " AND im.itemname LIKE %s"
            params.append(f"%{item_name}%")

        if alter_item_no:
            base_sql += " AND im.alternateitemno LIKE %s"
            params.append(f"%{alter_item_no}%")

        if serial_item in ["0", "1"]:  # ensure valid input
            base_sql += " AND im.itemwithserial = %s"
            params.append(int(serial_item))

        # 动态搜索关键字
        if search:
            base_sql += " AND (im.itemname LIKE %s OR im.itemno LIKE %s)"
            params.extend([f"%{search}%", f"%{search}%"])

        # 先查询总条数
        count_sql = f"SELECT COUNT(*) FROM ({base_sql}) AS count_table"
        with connections['cloudmssql'].cursor() as cursor:
            cursor.execute(count_sql, params)
            total_count = cursor.fetchone()[0]

        # 加上分页
        base_sql += " ORDER BY createdon DESC OFFSET %s ROWS FETCH NEXT %s ROWS ONLY "
        params.extend([offset, page_size])

        with connections['cloudmssql'].cursor() as cursor:
            cursor.execute(base_sql, params)
            columns = [col[0] for col in cursor.description]
            items = [dict(zip(columns, row)) for row in cursor.fetchall()]

        return Response({
            "page": page,
            "page_size": page_size,
            "total": total_count,
            "total_pages": ceil(total_count / page_size),
            "results": items
        })
    except Exception as e:
        # Always return JSON so frontend won’t see HTML error page
        return Response({"error": str(e)}, status=500)
    
from .models import ItemType,ItemGroup,ItemCategory,ItemBillGroup,ItemClassification 
from . models import ItemFrequency,ItemDosage,ItemPrecaution,ItemInstruction,ItemIndication,ItemSupplier,ItemUOM,ItemTax
def stock_item_master_select(request):
    branch_rno = request.session.get('branch_rno')
    itemtypes = ItemType.objects.using('cloudmssql').filter(branch_rno=branch_rno)
    itemgroups = ItemGroup.objects.using('cloudmssql').filter(branch_rno=branch_rno)
    itemcategories = ItemCategory.objects.using('cloudmssql').filter(branch_rno=branch_rno)
    itembillgroups = ItemBillGroup.objects.using('cloudmssql').filter(branch_rno=branch_rno)
    itemclassifications = ItemClassification.objects.using('cloudmssql').all()
    ItemFrequencies = ItemFrequency.objects.using('cloudmssql').filter(branch_rno=branch_rno)
    itemdosages = ItemDosage.objects.using('cloudmssql').filter(branch_rno=branch_rno)
    itemprecautions = ItemPrecaution.objects.using('cloudmssql').filter(branch_rno=branch_rno)
    iteminstructions = ItemInstruction.objects.using('cloudmssql').filter(branch_rno=branch_rno)
    itemindications = ItemIndication.objects.using('cloudmssql').filter(branch_rno=branch_rno)
    itemsupplier = ItemSupplier.objects.using('cloudmssql').filter(branch_rno=branch_rno)
    itemuom = ItemUOM.objects.using('cloudmssql').filter(branch_rno=branch_rno)
    itemtax = ItemTax.objects.using('cloudmssql').all()

    return render(request, "pages/itemmaster/stock_item_master_form.html", {
        "types": itemtypes,
        "groups": itemgroups,
        "categories":itemcategories ,
        "billgroups":itembillgroups ,
        "classifications": itemclassifications,
        "frequencies": ItemFrequencies,
        "dosages": itemdosages,
        "precautions": itemprecautions,
        "instructions": iteminstructions,
        "indications": itemindications,
        "suppliers": itemsupplier,
        "itemuom": itemuom,
        "taxes": itemtax,
    })




@require_http_methods(["POST"])
def create_inventory_item(request):
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
            'isactive', 'noexpirydateitem', 'istaxable', 'labelprint', 
            'isvaccine', 'iscontroldrug', 'itemwithserial', 'istaxinclusive'
        ]
        
        for field in boolean_fields:
            if field in data:
                data[field] = data[field].lower() in ['true', '1', 'on']
        
        # Convert numeric fields
        numeric_fields = [
            'unitcost', 'unitsellprice', 'openingqty', 'maximum', 'minimum', 'reorder',
            'salesfactor', 'purchasefactor', 'salesprice', 'salesprice2', 'salesprice3',
            'salesprice4', 'salesprice5', 'salesprice6', 'purchaseprice', 'x_salesprice',
            'x_salesprice2', 'x_salesprice3', 'x_salesprice4', 'timeperday'
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
            
            
            # Build the insert query dynamically
            sql = """
            INSERT INTO [groupclinic].[Inventory].[itemmaster] 
            ( branch_rno, itemno, itemname, alternateitemno, universalitemno, 
             brand_rno, category_rno, itemtype, itemgroup, supplier1_rno, supplier2_rno, 
             supplier3_rno, shelf, packing, unit, unitcost, unitsellprice, markupratio, 
             markupprice, openingqty, maximum, minimum, reorder, length, width, thickness, 
             color, size, itemstatus, remark, picture, createdby, createdon, modifiedby, 
             modifiedon, purchaseunit, purchasefactor, salesunit, salesfactor, 
             specification, costingmethod, isserviceitem, barcode, isassembly, 
             mastertype, salesprice, purchaseprice, billgrp_rno, frequency, dosage, 
             precaution, indication, instruction, labelprint, AestheticPackage_times, 
             min_sellprice, taxtype, taxcode, pricegroup_rno, dose, timeperday, isactive, 
             defaultexpiredate, frequency_c, frequency_m, dosage_c, dosage_m, 
             precaution_c, precaution_m, indication_c, indication_m, instruction_c, 
             instruction_m, isqtycalbydosetime, isvaccine,
             iscontroldrug, itemwithserial, salesprice3, salesprice4, salesprice5, 
             salesprice6, salesprice2, creditpoint, iscenterpacking, noexpirydateitem, 
             profits, iscryoitem, remotestockstatus, taxpercentage, istaxable, 
             othersyskey, classificationcode, x_istaxinclusive, istaxinclusive, 
             x_salesprice, x_salesprice2, x_salesprice3, x_salesprice4, x_salesprice5, 
             x_salesprice6, x_taxrate, x_taxcode, taxrate)
            VALUES 
            (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
             %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
             %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
             %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
             %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
             %s,%s,%s)

             
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

            

            # Prepare parameters in the correct order
            params = [
                branch_rno,
                data.get('itemno','Abc123'),  # itemno - generate if empty
                data.get('itemname'),  # itemname
                data.get('alternateitemno'),  # alternateitemno
                data.get('universalitemno'),  # universalitemno
                to_int(data.get('brand_rno')),  # brand_rno - bigint
                to_int(data.get('category_rno')),  # category_rno - bigint
                to_int(data.get('itemtype')),  # itemtype - bigint
                to_int(data.get('itemgroup')),  # itemgroup - bigint
                to_int(data.get('supplier1_rno')),  # supplier1_rno - bigint
                to_int(data.get('supplier2_rno')),  # supplier2_rno - bigint
                to_int(data.get('supplier3_rno')),  # supplier3_rno - bigint
                data.get('shelf'),  # shelf
                data.get('packing'),  # packing
                data.get('unit'),  # unit
                to_float(data.get('unitcost')),  # unitcost - numeric(15,3)
                to_float(data.get('unitsellprice')),  # unitsellprice - numeric(15,3)
                to_float(data.get('markupratio')),  # markupratio - numeric(15,3)
                to_float(data.get('markupprice')),  # markupprice - numeric(15,3)
                to_float(data.get('openingqty')),  # openingqty - numeric(15,3)
                to_float(data.get('maximum')),  # maximum - numeric(15,3)
                to_float(data.get('minimum')),  # minimum - numeric(15,3)
                to_float(data.get('reorder')),  # reorder - numeric(15,3)
                to_float(data.get('length')),  # length - numeric(15,3) - CHANGED to to_float
                to_float(data.get('width')),  # width - numeric(15,3) - CHANGED to to_float
                to_float(data.get('thickness')),  # thickness - numeric(15,3) - CHANGED to to_float
                data.get('color'),  # color
                data.get('size'),  # size
                data.get('itemstatus'),  # itemstatus - default Active
                data.get('remark'),  # remark
                data.get('picture', None),  # picture
                user,
                current_time,  # createdon
                data.get('modifiedby'),  # modifiedby
                data.get('modifiedon'),  # modifiedon
                data.get('purchaseunit'),  # purchaseunit
                to_float(data.get('purchasefactor')),  # purchasefactor - numeric(15,3) - ADDED to_float
                data.get('salesunit'),  # salesunit
                to_float(data.get('salesfactor')),  # salesfactor - numeric(15,3) - ADDED to_float
                data.get('specification'),  # specification
                to_int(data.get('costingmethod')),  # costingmethod - smallint - CHANGED to to_int
                data.get('isserviceitem'),  # isserviceitem
                data.get('barcode'),  # barcode
                data.get('isassembly', False),  # isassembly
                data.get('mastertype', 'Stock Items'),  # mastertype - default Item
                to_float(data.get('salesprice')),  # salesprice - numeric(15,3)
                to_float(data.get('purchaseprice')),  # purchaseprice - numeric(15,3)
                to_int(data.get('billgrp_rno')),  # billgrp_rno - bigint
                data.get('frequency'),  # frequency
                data.get('dosage'),  # dosage
                data.get('precaution'),  # precaution
                data.get('indication'),  # indication
                data.get('instruction'),  # instruction
                data.get('labelprint', True),  # labelprint
                to_int(data.get('AestheticPackage_times')),  # AestheticPackage_times - int
                to_float(data.get('min_sellprice')),  # min_sellprice - numeric(15,3)
                data.get('taxtype', ''),  # taxtype
                data.get('taxcode', ''),  # taxcode
                to_int(data.get('pricegroup_rno')),  # pricegroup_rno - bigint
                to_float(data.get('dose', '')),  # dose - numeric(15,3) - CHANGED to to_float
                to_float(data.get('timeperday', 1)),  # timeperday - numeric(15,3) - CHANGED to to_float
                data.get('isactive', True),  # isactive
                data.get('defaultexpiredate'),  # defaultexpiredate
                data.get('frequency_c', ''),  # frequency_c
                data.get('frequency_m', ''),  # frequency_m
                data.get('dosage_c', ''),  # dosage_c
                data.get('dosage_m', ''),  # dosage_m
                data.get('precaution_c', ''),  # precaution_c
                data.get('precaution_m', ''),  # precaution_m
                data.get('indication_c', ''),  # indication_c
                data.get('indication_m', ''),  # indication_m
                data.get('instruction_c', ''),  # instruction_c
                data.get('instruction_m', ''),  # instruction_m
                data.get('isqtycalbydosetime', False),  # isqtycalbydosetime
                data.get('isvaccine', False),  # isvaccine
                data.get('iscontroldrug', False),  # iscontroldrug
                data.get('itemwithserial', False),  # itemwithserial
                to_float(data.get('salesprice3')),  # salesprice3 - numeric(15,3)
                to_float(data.get('salesprice4')),  # salesprice4 - numeric(15,3)
                to_float(data.get('salesprice5')),  # salesprice5 - numeric(15,3)
                to_float(data.get('salesprice6')),  # salesprice6 - numeric(15,3)
                to_float(data.get('salesprice2')),  # salesprice2 - numeric(15,3)
                to_int(data.get('creditpoint')),  # creditpoint - int
                data.get('iscenterpacking', False),  # iscenterpacking
                data.get('noexpirydateitem', False),  # noexpirydateitem
                to_float(data.get('profits')),  # profits - numeric(15,3)
                data.get('iscryoitem', False),  # iscryoitem
                data.get('remotestockstatus', ''),  # remotestockstatus
                to_float(data.get('taxpercentage')),  # taxpercentage - numeric(15,3)
                data.get('istaxable', False),  # istaxable
                to_int(data.get('othersyskey', '')),  # othersyskey - bigint
                data.get('classificationcode', ''),  # classificationcode
                data.get('x_istaxinclusive', False),  # x_istaxinclusive
                data.get('istaxinclusive', False),  # istaxinclusive
                to_float(data.get('x_salesprice')),  # x_salesprice - numeric(15,3)
                to_float(data.get('x_salesprice2')),  # x_salesprice2 - numeric(15,3)
                to_float(data.get('x_salesprice3')),  # x_salesprice3 - numeric(15,3)
                to_float(data.get('x_salesprice4')),  # x_salesprice4 - numeric(15,3)
                to_float(data.get('x_salesprice5')),  # x_salesprice5 - numeric(15,3)
                to_float(data.get('x_salesprice6')),  # x_salesprice6 - numeric(15,3)
                to_float(data.get('x_taxrate')),  # x_taxrate - numeric(15,3)
                data.get('x_taxcode', ''),  # x_taxcode
                to_float(data.get('taxrate')),  # taxrate - numeric(15,3)
            ]
            print("SQL placeholders:", sql.count("%s"))
            print("Params length:", len(params))
            # Execute the insert
            cursor.execute(sql, params)
            
            
            cursor.execute("SELECT ISNULL(MAX(item_rno), 0)  FROM [groupclinic].[Inventory].[itemmaster]")
            item_rno = cursor.fetchone()[0]
            # 插入 openqty_branch
            openqty_sql = """
            INSERT INTO [groupclinic].[Inventory].[openqty_branch] 
            (branch_rno, item_rno, openingqty, minimum, reorderqty, 
            createdby, createdon, modifiedby, modifiedon, costingmethod, 
            unitcost, openingdate, closingdate, closingqty, defaultexpiredate)
            VALUES
            (%s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s)
            """

            openqty_params = [
                branch_rno,
                item_rno,
                to_float(data.get('openingqty', 0)),   # 初始库存
                
                to_float(data.get('minimum', 0)),      # 最小库存
                to_float(data.get('reorder', 0)),      # 再订购点
                user,                                  # createdby
                current_time,                          # createdon
                None,                                  # modifiedby
                None,                                  # modifiedon
                to_int(data.get('costingmethod', 1)),  # 成本方法
                to_float(data.get('unitcost', 0)),     # 单位成本
                data.get('openingdate'),                          # openingdate
                None,                                  # closingdate
                to_float(data.get('openingqty', 0)),   # closingqty = openingqty
                data.get('defaultexpiredate'),         # 默认过期日
                
            ]

            cursor.execute(openqty_sql, openqty_params)

        
        

        return JsonResponse({
            'success': True,
            'message': 'Item created successfully',
            'item_rno': item_rno,
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=400)


@csrf_exempt  
@require_http_methods(["GET"])
def get_inventory_item(request, item_rno):
    branch_rno = request.session.get('branch_rno')
    try:
        connection = connections['cloudmssql']
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT o.openingdate  ,i.*
                    
                FROM [Inventory].[itemmaster] i
                LEFT JOIN [Inventory].[openqty_branch] o 
                    ON o.item_rno = i.item_rno
                WHERE i.item_rno = %s
                AND i.branch_rno = %s;

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
def update_inventory_item(request, item_rno):
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
def delete_inventory_item(request):
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
                AND mastertype = 'Stock Items'
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

@require_http_methods(["GET"])
def get_multiuom(request, item_rno):
    """获取指定item_rno的所有UOM数据"""
    branch_rno = request.session.get('branch_rno')
    
    try:
        connection = connections['cloudmssql']
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT [itemuom_rno]
                      ,[item_rno]
                      ,[unit]
                      ,[factor]
                      ,[refcost]
                      ,[refprice]
                      ,[createdby]
                      ,[createdon]
                      ,[modifiedby]
                      ,[modifiedon]
                      ,[branch_uid]
                      ,[branch_rno]
                      ,[refprice2]
                      ,[refprice3]
                      ,[refprice4]
                      ,[refprice5]
                      ,[refprice6]
                      ,[x_refprice]
                      ,[x_refprice2]
                      ,[x_refprice3]
                      ,[x_refprice4]
                      ,[x_refprice5]
                      ,[x_refprice6]
                FROM [groupclinic].[Inventory].[itemUOM]
                WHERE item_rno = %s AND branch_rno = %s
                ORDER BY [itemuom_rno]
            """, [item_rno, branch_rno])
            
            rows = cursor.fetchall()
            
            # Get column names
            columns = [col[0] for col in cursor.description]
            
            # Convert rows to list of dictionaries
            data = []
            for row in rows:
                item_data = dict(zip(columns, row))
                
                # Convert datetime objects to strings
                for key, value in item_data.items():
                    if hasattr(value, 'isoformat'):
                        item_data[key] = value.isoformat()
                    elif value is None:
                        item_data[key] = ''
                
                data.append(item_data)
            
            return JsonResponse({
                'success': True,
                'data': data,
                'count': len(data)
            })
            
    except Exception as e:
      
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)


import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import connections

@csrf_exempt
@require_http_methods(["POST"])
def save_multiuom(request, item_rno):
    branch_rno = request.session.get("branch_rno")
    user = request.session.get("name")

    try:
        data = json.loads(request.body)

        # Check if itemuom_rno exists to determine if it's create or update
        itemuom_rno = data.get("itemuom_rno")

        # Map JSON keys to DB column names
        field_mapping = {
            "uom": "unit",
            "factor": "factor",
            "normalPrice": "refprice",
            "price1": "refprice2",
            "price2": "refprice3",
            "price3": "refprice4",
            "price4": "refprice5",
            "buyMed": "refprice6",
            "nonCitizenPrice1": "x_refprice",
            "nonCitizenPrice2": "x_refprice2",
            "nonCitizenPrice3": "x_refprice3",
            "nonCitizenPrice4": "x_refprice4",
            "nonCitizenPrice5": "x_refprice5",
            "nonCitizenBuyMed": "x_refprice6",
        }

        connection = connections["cloudmssql"]

        if not itemuom_rno:
            # CREATE NEW RECORD
            fixed_fields = {
                "item_rno": item_rno,
                "branch_rno": branch_rno,
                "createdby": user,
            }

            columns = []
            values = []
            placeholders = []

            # Add dynamic fields (只插入有传的)
            for key, col in field_mapping.items():
                if key in data:  # 用户 JSON 里有这个 key
                    columns.append(col)
                    values.append(data[key])
                    placeholders.append("%s")

            # Add fixed fields
            for col, val in fixed_fields.items():
                columns.append(col)
                values.append(val)
                placeholders.append("%s")

            # Add createdon timestamp
            columns.append("createdon")
            placeholders.append("GETDATE()")

            sql = f"""
                INSERT INTO [groupclinic].[Inventory].[itemUOM]
                ({", ".join(columns)})
                OUTPUT INSERTED.itemuom_rno
                VALUES ({", ".join(placeholders)})
            """

            with connection.cursor() as cursor:
                cursor.execute(sql, values)
                result = cursor.fetchone()
                new_itemuom_rno = result[0] if result else None

            return JsonResponse(
                {
                    "success": True,
                    "message": "UOM record created successfully",
                    "itemuom_rno": new_itemuom_rno,
                }
            )

        else:
            # UPDATE EXISTING RECORD
            set_clauses = []
            values = []

            # 只更新 request JSON 有传的字段
            for key, col in field_mapping.items():
                if key in data:  # 只管传过来的字段
                    set_clauses.append(f"{col} = %s")
                    values.append(data[key])

            # 如果没有要更新的字段就直接返回
            if not set_clauses:
                return JsonResponse(
                    {"success": False, "message": "No fields to update"},
                    status=400,
                )

            # Always update modifier info
            set_clauses.append("branch_rno = %s")
            set_clauses.append("modifiedby = %s")
            set_clauses.append("modifiedon = GETDATE()")
            values.extend([branch_rno, user])

            # Add WHERE clause
            values.append(itemuom_rno)

            sql = f"""
                UPDATE [groupclinic].[Inventory].[itemUOM]
                SET {", ".join(set_clauses)}
                WHERE itemuom_rno = %s
            """

            with connection.cursor() as cursor:
                cursor.execute(sql, values)
                if cursor.rowcount == 0:
                    return JsonResponse(
                        {"success": False, "message": "No record found to update"},
                        status=404,
                    )

            return JsonResponse(
                {
                    "success": True,
                    "message": "UOM record updated successfully",
                    "itemuom_rno": itemuom_rno,
                }
            )

    except json.JSONDecodeError:
        return JsonResponse(
            {"success": False, "message": "Invalid JSON data"}, status=400
        )
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=500)



# You can remove the separate update_multiuom function since it's now handled in save_multiuom

    

import logging
logger = logging.getLogger(__name__)
@csrf_exempt
@require_http_methods(["DELETE"])
def delete_multiuom(request, itemuom_rno):
    """删除指定的UOM记录"""
    branch_rno = request.session.get('branch_rno')
    
    try:
        connection = connections['cloudmssql']
        with connection.cursor() as cursor:
            # First check if record exists
            cursor.execute("""
                SELECT COUNT(*) FROM [groupclinic].[Inventory].[itemUOM]
                WHERE [itemuom_rno] = %s AND [branch_rno] = %s
            """, [itemuom_rno,  branch_rno])
            
            if cursor.fetchone()[0] == 0:
                return JsonResponse({
                    'success': False,
                    'message': 'UOM record not found'
                }, status=404)
            
            # Delete the record
            cursor.execute("""
                DELETE FROM [groupclinic].[Inventory].[itemUOM]
                WHERE [itemuom_rno] = %s AND [branch_rno] = %s
            """, [itemuom_rno, branch_rno])
            
            return JsonResponse({
                'success': True,
                'message': 'UOM record deleted successfully'
            })
            
    except Exception as e:
        
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)


def get_out_quantity_view(request, item_rno):
    branch_rno = request.session.get('branch_rno')

    try:
        with connections['cloudmssql'].cursor() as cursor:
            cursor.execute("""
                DECLARE @OUTQTY NUMERIC(15,3);
                EXEC [Inventory].[procGetOutQuantity] 
                    @branch_rno=%s, 
                    @item_rno=%s, 
                    @OUTQTY=@OUTQTY OUTPUT;

                SELECT @OUTQTY AS outqty;

                SELECT itemname 
                FROM [Inventory].[itemmaster]
                WHERE item_rno = %s;
            """, [branch_rno, item_rno, item_rno])

            # 第一个结果集: outqty
            row1 = cursor.fetchone()
            outqty = row1[0] if row1 and row1[0] is not None else 0
            outqty = int(outqty)

            # 移动到下一个结果集 (name)
            cursor.nextset()
            row2 = cursor.fetchone()
            name = row2[0] if row2 else "Unknown"

        context = {
            "name": name,
            "outqty": outqty,
        }
        return render(request, "pages/itemmaster/onhandquantity.html", context)

    except Exception as e:
        print("ERROR OCCURRED:", str(e))
        return render(request, "pages/itemmaster/onhandquantity.html", {"error": str(e)})


def onhandquantity(request, item_rno, method):
    branch_rno = request.session.get('branch_rno')

    try:
        connection = connections['cloudmssql']
        with connection.cursor() as cursor:
            # 1. 先查出 openingdate
            cursor.execute("""
                SELECT openingdate 
                FROM Inventory.openqty_branch 
                WHERE item_rno = %s AND branch_rno = %s
            """, [item_rno, branch_rno])
            row = cursor.fetchone()
            openingdate = row[0] if row else datetime.date.today()

            # 2. 存储过程映射
            procedures = {
                1: "[Inventory].[procStockCosting_FIFO]",
                2: "[Inventory].[procStockCosting_LastPurchaseCost]",
                3: "[Inventory].[procStockCosting_Manual]",
                4: "[Inventory].[procStockCosting_Average]"
            }
            proc_name = procedures.get(method)
            if not proc_name:
                return JsonResponse({"error": "Invalid method"}, status=400)

            # 3. 执行存储过程
            cursor.execute(f"EXEC {proc_name} %s, %s, %s, %s",
                           [branch_rno, item_rno, 1, openingdate])

            # 4. 处理多个结果集，找到第一个 SELECT
            while cursor.description is None and cursor.nextset():
                pass

            if cursor.description:
                columns = [col[0] for col in cursor.description]
                results = [dict(zip(columns, row)) for row in cursor.fetchall()]
            else:
                results = []

        return JsonResponse(results, safe=False)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


