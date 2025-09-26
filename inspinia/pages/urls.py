# Proxy endpoints for external API (CORS bypass)
from .views import proxy_api_login, proxy_api_subscriptions
from django.urls import path, include
from . import views
from . import index_views
from . import stock_item_master_views
from . import service_item_master_views
from . import company_views
app_name = "inspinia"

urlpatterns = [
    path('', views.root_page_view, name="Home"),
    path('dashboard/', views.dashboard, name='dashboard'),
    path("api/clinic/", views.Customer_list, name='customer_list'),  
    path('api/securitycode/check/', views.security_code_check, name='security_code_check'), 
    path('sendtoqueue/<int:customer_rno>/', index_views.send_to_queue_details, name='sendtoqueue'),
    path('api/billtype/list/', views.billtype_list, name='sendtoqueue'),
    path("api/delete-customer/", views.delete_customer, name="delete_customer"),
    path('api/customer/save/', views.save_customer, name='save_customer'),
    path('api/customer/update/', views.update_customer, name='update_customer'),

    # admin
    path("admin-login/", views.admin_login_api, name="admin_login"),

    #client subscription
    path('client-subscriptions/', views.client_subscriptions, name='client_subscriptions'),

    # Proxy endpoints for external API (CORS bypass)
    path('api/proxy/login/', proxy_api_login, name='proxy_api_login'),
    path('api/proxy/subscriptions/', proxy_api_subscriptions, name='proxy_api_subscriptions'),
   
    path('tables-datatables-columns/', views.customer_form_select, name='new-customer-form'),
    path('api/customer_detail/<int:customer_rno>/', views.view_customer_details, name='view_customer_detail'),
    path('api/customers/today-count/', views.today_customer_count, name='today_customer_count'),
    path('api/customers/today-list/', views.today_customer_list, name='today_customer_list'),
    path('api/customers/today-stats/', views.today_customer_stats, name='today_customer_stats'),
    path('api/customers/queue_list',index_views.Queue_list , name='Queue_list'),
    path('api/customers/customer-panel-company/',views.customer_panel_company , name='customerpanelcompany'),
    path('api/customers/panel-company-list/',views.panel_company_list , name='panelcompany'),

    # table order
    path('api/table/save-table-order/', index_views.save_table_order, name='save_table_order'),
    path('api/table/delete-table-order/', index_views.delete_table_order, name='delete_table_order'),
    path('api/table/get-table-order/', index_views.get_table_order, name='get_table_order'),
    # Simple APIs (without DRF - alternative)


    path('api/registration/submit/', index_views.save_registration, name='save_registration'),
   
    path('api/queue/next-number/', index_views.get_latest_visit, name='next_queue_number'),
    path('api/queue/doctor-select/', index_views.docter_list, name='doctor_select'),
    path('api/customers/today-count-simple/', views.today_customer_count_simple, name='today_customer_count_simple'),
    path('api/customers/today-list-simple/', views.today_customer_list_simple, name='today_customer_list_simple'),


    #itemmaster
    #stockitemmaster
    path('itemmaster/stock_item_master_form/', stock_item_master_views.stock_item_master_select, name='stock-item-master-form'),
    path('itemmaster/onhandquantity/<int:item_rno>/', stock_item_master_views.get_out_quantity_view, name='get_out_quantity'),
    path('api/itemmaster/stock_item_master_form_submit/', stock_item_master_views.create_inventory_item, name='stock-item-master-submit'),
    path('api/itemmaster/stock_item_master_view/<int:item_rno>/', stock_item_master_views.get_inventory_item, name='stock-item-master-view'),
    path('api/itemmaster/stock_item_master_update/<int:item_rno>/', stock_item_master_views.update_inventory_item, name='stock-item-master-update'),
    path('api/itemmaster/stock_item_master_delete/', stock_item_master_views.delete_inventory_item, name='stock-item-master-delete'),
    path('api/itemmaster/stock_item_master_list/', stock_item_master_views.item_list, name='stock-item-master-list'),

    path('api/itemmaster/stock_item_master_multiuom/<int:item_rno>/', stock_item_master_views.get_multiuom, name='stock-item-master-uom'),
    path('api/itemmaster/stock_item_master_multiuom_save/<int:item_rno>/', stock_item_master_views.save_multiuom, name='stock-item-master-uom-save'),
    path('api/itemmaster/stock_item_master_multiuom_delete/<int:itemuom_rno>/', stock_item_master_views.delete_multiuom, name='stock-item-master-uom-delete'),
    path('api/stock_item_master/onhandquantity/<int:item_rno>/<int:method>/', stock_item_master_views.onhandquantity, name='stock-item-master-onhand'),


    #serviceitemmaster
    path('api/itemmaster/service_item_master_list/', service_item_master_views.service_item_list, name='service-item-master-list'),
    path('itemmaster/service_item_master_form/', service_item_master_views.service_item_master_select, name='service-item-master-select'),
    path('api/itemmaster/service_item_master_form_submit/', service_item_master_views.create_service_item, name='service-item-master-submit'),
    path('api/itemmaster/service_item_master_view/<int:item_rno>/', service_item_master_views.get_service_item, name='service-item-master-view'),
    path('api/itemmaster/service_item_master_update/<int:item_rno>/', service_item_master_views.update_service_item, name='service-item-master-update'),
    path('api/itemmaster/service_item_master_delete/', service_item_master_views.delete_service_item, name='service-item-master-delete'),


    path('itemmaster/<str:template_name>/', views.itemmaster_dynamic_pages_view, name='itemmaster_dynamic_pages'),


    path('<str:template_name>/', views.dynamic_pages_view, name='dynamic_pages'),

    #panel company
    path('api/corporate/get_panel_company/', company_views.get_panel_company, name='get_panel_company'),
    path('api/corporate/get-client-data/', company_views.get_client_data, name='get_client_data'),
    path('api/corporate/save_panel_company/', company_views.save_panel_company, name='save_panel_company'),
    path('api/corporate/update_panel_company/', company_views.update_panel_company, name='update_panel_company'),
    path('api/corporate/delete_panel_company/', company_views.delete_panel_company, name='delete_panel_company'),
    path('corporate/<str:template_name>/', views.corporate_dynamic_pages_view, name='corporate_dynamic_pages'),
    
]


