from rest_framework import serializers
from .models import Customer, Branch
from django.db.models import OuterRef, Subquery
import base64

branchname_subquery = Branch.objects.filter(
    branch_rno=OuterRef('branch__branch_rno')
).values('branchname')[:1]

customers = Customer.objects.annotate(
    branchname=Subquery(branchname_subquery)
)


class CustomerSerializer(serializers.ModelSerializer):
    # 方法1: 通过related field获取branch name
    branch_name = serializers.CharField(source='branch.branchname', read_only=True)
    branch_rno = serializers.CharField(source='branch.branch_rno', read_only=True)

    photo = serializers.SerializerMethodField()
    class Meta:
        model = Customer
        fields = ['branch_name','customerno','customer_rno','branch_rno','title','patient_dateofbirth','gender',
                 'name','icno', 'inv_address1','inv_address2','inv_address3', 'phone1','photo']
        
    def get_photo(self, obj):
        if obj.photo:  # obj.photo is bytes
            return base64.b64encode(obj.photo).decode("utf-8")
        return None



class ViewCustomerDetail(serializers.Serializer):
    pcompanyname = serializers.CharField()
    photo = serializers.SerializerMethodField()

    def get_photo(self, obj):
        if obj.photo:
            return base64.b64encode(obj.photo).decode("utf-8")
        return None



    
class sentoqueuedetail(serializers.Serializer):
    customer_rno = serializers.CharField()
    title = serializers.CharField()
    name = serializers.CharField()
    pcompanyname = serializers.CharField()
    panelcomp_rno = serializers.CharField()
    billtype = serializers.CharField()
    photo = serializers.SerializerMethodField()

    def get_photo(self, obj):
        photo_bytes = obj.get('photo')
        if photo_bytes:
            return base64.b64encode(photo_bytes).decode('utf-8')
        return None
    
class TodayCustomerSerializer(serializers.ModelSerializer):
    """
Serializer for today's customer list - optimized for modal display
    """
    customer_no = serializers.CharField(source='customerno')
    created_time = serializers.SerializerMethodField()
    created_datetime = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    primary_address = serializers.SerializerMethodField()
    class Meta:
        model = Customer
        fields = [
            'customer_rno',  # Primary key
            'customerno',
            'name',
            'phone1',
            'email',

            'createdby',
            'primary_address',
            'icno',
            'gender',
            'age_display',
            'isforeigner',
            'branch_uid'
        ]
    
    def get_created_time(self, obj):
        """Return formatted time (HH:MM)"""
        if obj.createon:
            return obj.createon.strftime('%H:%M')
        return 'Unknown'
    
    def get_created_datetime(self, obj):
        """Return full datetime string"""
        if obj.createon:
            return obj.createon.strftime('%Y-%m-%d %H:%M:%S')
        return None
    
    def get_phone(self, obj):
        """Return the first available phone number"""
        return (obj.phone1 or obj.mobileno1 or 
                obj.phone2 or obj.mobileno2 or None)
    
    def get_primary_address(self, obj):
        """Return the primary address"""
        return obj.address or obj.inv_address1 or None


class CustomerStatsSerializer(serializers.Serializer):
    """
    Serializer for customer statistics data
    """
    total_count = serializers.IntegerField()
    gender_distribution = serializers.DictField()
    hourly_distribution = serializers.DictField()
    branch_distribution = serializers.DictField()
    nationality = serializers.DictField()
    date = serializers.CharField()
    last_updated = serializers.DateTimeField()
    success = serializers.BooleanField(default=True)


class CustomerCountSerializer(serializers.Serializer):
    """
    Serializer for customer count response
    """
    count = serializers.IntegerField()
    date = serializers.CharField()
    success = serializers.BooleanField(default=True)
    
   