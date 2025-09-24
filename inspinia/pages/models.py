from django.db import models

class Branch(models.Model):

    branch_uid = models.UUIDField(db_column='branch_uid')
    branch_rno = models.CharField(max_length=50, primary_key=True)
    registerno = models.CharField(max_length=100, null=True, blank=True)
    branchname = models.CharField(max_length=255)
    branchcompany = models.CharField(max_length=255, null=True, blank=True)
    
    # Contact information
    tel1 = models.CharField(max_length=20, null=True, blank=True)
    tel2 = models.CharField(max_length=20, null=True, blank=True)
    fax1 = models.CharField(max_length=20, null=True, blank=True)
    fax2 = models.CharField(max_length=20, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    website = models.URLField(null=True, blank=True)
    
    # Address information
    address1 = models.CharField(max_length=255, null=True, blank=True)
    address2 = models.CharField(max_length=255, null=True, blank=True)
    address3 = models.CharField(max_length=255, null=True, blank=True)
    
    cityname = models.CharField(max_length=100, null=True, blank=True)
    zipcode = models.CharField(max_length=20, null=True, blank=True)
    
    # Personnel
    personincharge = models.CharField(max_length=255, null=True, blank=True)
    
    # Audit fields
    createdby = models.CharField(max_length=100, null=True, blank=True)
    createon = models.DateTimeField(null=True, blank=True)
    createdon = models.DateTimeField(null=True, blank=True)
    modifiedby = models.CharField(max_length=100, null=True, blank=True)
    modifyon = models.DateTimeField(null=True, blank=True)
    modifiedon = models.DateTimeField(null=True, blank=True)
    editable = models.BooleanField(default=True)
    
    # Pricing and markup
    isforeignermarkup = models.BooleanField(default=False)
    foreignermarkup = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    foreignermarkuptype = models.CharField(max_length=50, null=True, blank=True)
    defaultconsultation_local = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    defaultconsultation_foreigner = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    defaultconsultation_fitemrno = models.CharField(max_length=50, null=True, blank=True)
    basepricepercent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    subprice = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    istaxinclusive = models.BooleanField(default=False)
    
    # Payment processing
    creditcard_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    debitcard_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # File paths and templates
    ReportTemplatePath = models.CharField(max_length=500, null=True, blank=True)
    letterhead = models.CharField(max_length=500, null=True, blank=True)
    attachmentpath = models.CharField(max_length=500, null=True, blank=True)
    logo = models.CharField(max_length=500, null=True, blank=True)
    image = models.CharField(max_length=500, null=True, blank=True)
    imagepath = models.CharField(max_length=500, null=True, blank=True)
    
    # System configuration
    costingmethod = models.CharField(max_length=50, null=True, blank=True)
    roundformula = models.CharField(max_length=50, null=True, blank=True)
    numberingserver = models.CharField(max_length=255, null=True, blank=True)
    numberingserverport = models.IntegerField(null=True, blank=True)
    
    # Rounding settings
    roundbyitem = models.BooleanField(default=False)
    roundbybillgroup = models.BooleanField(default=False)
    roundbytotal = models.BooleanField(default=False)
    
    # Doctor settings
    isgetlastdoctor = models.BooleanField(default=False)
    
    # SMTP configuration
    smtp_from_addr = models.EmailField(null=True, blank=True)
    smtp_from_name = models.CharField(max_length=255, null=True, blank=True)
    smtp_host = models.CharField(max_length=255, null=True, blank=True)
    smtp_port = models.IntegerField(null=True, blank=True)
    smtp_username = models.CharField(max_length=255, null=True, blank=True)
    smtp_password = models.CharField(max_length=255, null=True, blank=True)
    
    # Registration and license
    regpasswordcheck = models.BooleanField(default=False)
    startdate = models.DateField(null=True, blank=True)
    enddate = models.DateField(null=True, blank=True)
    renewdate = models.DateField(null=True, blank=True)
    islocked = models.BooleanField(default=False)
    operatingtime = models.CharField(max_length=255, null=True, blank=True)
    
    # Points and loyalty system
    pointperdollar = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    pointvalidperiod = models.IntegerField(null=True, blank=True)
    dollarperpoint = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # System type flags
    isPharmacy = models.BooleanField(default=False)
    isICvisible = models.BooleanField(default=False)
    isDentalSys = models.BooleanField(default=False)
    isAesthetic = models.BooleanField(default=False)
    isPhysio = models.BooleanField(default=False)
    isMarketingItem = models.BooleanField(default=False)
    isPrescriptioncheck = models.BooleanField(default=False)
    isCollectPaymentchecking = models.BooleanField(default=False)
    
    # Print and display settings
    openprintTab = models.BooleanField(default=False)
    immdeductstock = models.BooleanField(default=False)
    druglabelwithletterhead = models.BooleanField(default=False)
    notallowdspblwstock = models.BooleanField(default=False)
    showsufficientstockonly = models.BooleanField(default=False)
    usepasscode = models.BooleanField(default=False)
    grantaccess_cn = models.BooleanField(default=False)
    
    # Calendar integration
    gcalendarembeded = models.CharField(max_length=1000, null=True, blank=True)
    calendartype = models.CharField(max_length=50, null=True, blank=True)
    calendarcolorevent = models.CharField(max_length=50, null=True, blank=True)
    
    # Footer remarks
    footremark1 = models.TextField(null=True, blank=True)
    footremark2 = models.TextField(null=True, blank=True)
    footremark3 = models.TextField(null=True, blank=True)
    clinicname = models.CharField(max_length=255, null=True, blank=True)
    
    # Geographic coordinates
    longitude_from = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)
    longitude_to = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)
    latitude_from = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)
    latitude_to = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)
    
    # EPF settings
    employer_epf = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    employee_epf = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # Subscription and billing
    SUBPERIOD = models.CharField(max_length=50, null=True, blank=True)
    
    # Tax and registration numbers
    TIN = models.CharField(max_length=50, null=True, blank=True)
    BusinessRegNo = models.CharField(max_length=100, null=True, blank=True)
    SSTRegNo = models.CharField(max_length=100, null=True, blank=True)
    MSIC = models.CharField(max_length=50, null=True, blank=True)
    
    # Tariff and classification
    tariffcode = models.CharField(max_length=50, null=True, blank=True)
    eClassficationType = models.CharField(max_length=50, null=True, blank=True)
    IdentificationCategory = models.CharField(max_length=50, null=True, blank=True)
    
    # Integration settings
    agoraAPPID = models.CharField(max_length=100, null=True, blank=True)
    client_id = models.CharField(max_length=255, null=True, blank=True)
    client_secret = models.CharField(max_length=255, null=True, blank=True)
    eInvoiceURL = models.URLField(null=True, blank=True)
    eInvoiceStartDate = models.DateField(null=True, blank=True)
    
    # Item configuration
    citem_rno = models.CharField(max_length=50, null=True, blank=True)
    citemname = models.CharField(max_length=255, null=True, blank=True)
    citemno = models.CharField(max_length=50, null=True, blank=True)
    
    class Meta:
        managed = False
        db_table = '[Inventory].[branch]'

class Group(models.Model):
    gc_rno = models.CharField(max_length=50, primary_key=True)
    branch = models.ForeignKey(
        Branch,
        on_delete=models.DO_NOTHING,
        db_column='branch_rno'  # 改成真实字段名
    )

    class Meta:
        managed = False
        db_table = '[Clinics].[GroupClinicList]'     
    
    


    
        
###Emergency Contact

# class CustomerSource(models.Model):
#     customergrp_rno = models.AutoField(primary_key=True)
#     customergroup = models.CharField(max_length=255)
#     branch_rno = models.IntegerField(null=True, blank=True)

#     class Meta:
#         db_table = '[Inventory].[customergroup]'
#         managed = False  # Prevent Django from altering this table

class Relationship(models.Model):
    relationship_rno = models.AutoField(primary_key=True)
    relationship = models.CharField(max_length=255)
    branch_rno = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = '[Clinics].[relationship]'
        managed = False  # Set to True only if Django should manage table creation

###other

class CustomerType(models.Model):
    customertype_rno = models.AutoField(primary_key=True)
    customertype = models.CharField(max_length=255)
    branch_rno = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = '[Inventory].[customertype]'
        managed = False  # Prevent Django from altering this table

class CustomerGroup(models.Model):
    customergrp_rno = models.AutoField(primary_key=True)
    customergroup = models.CharField(max_length=255)
    branch_rno = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = '[Inventory].[customergroup]'
        managed = False  # Prevent Django from altering this table

class CustomerRace(models.Model):
    race_rno = models.AutoField(primary_key=True)
    race = models.CharField(max_length=255)
    branch_rno = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = '[Clinics].[race]'
        managed = False  # Prevent Django from altering this table


class CustomerMaritalStatus(models.Model):
    maritalstatus_rno = models.AutoField(primary_key=True)
    maritalstatus = models.CharField(max_length=255)
    branch_rno = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = '[Clinics].[maritalstatus]'
        managed = False  # Prevent Django from altering this table

class CustomerOccupation(models.Model):
    occupation_rno = models.AutoField(primary_key=True)
    occupation = models.CharField(max_length=255)
    branch_rno = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = '[Clinics].[occupation]'
        managed = False  # Prevent Django from altering this table

class CustomerLanguage(models.Model):
    language_rno = models.AutoField(primary_key=True)
    language = models.CharField(max_length=255)
    branch_rno = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = '[Clinics].[language]'
        managed = False  # Prevent Django from altering this table

class CustomerReligion(models.Model):
    religion_rno = models.AutoField(primary_key=True)
    religion = models.CharField(max_length=255)
    branch_rno = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = '[Clinics].[religion]'
        managed = False  # Prevent Django from altering this table

class CustomerDiscountLevel(models.Model):
    discat_rno = models.AutoField(primary_key=True)
    category = models.CharField(max_length=255)
    percentage1 = models.CharField(max_length=255)
    percentage2 = models.CharField(max_length=255)
    percentage3 = models.CharField(max_length=255)
    branch_rno = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = '[Inventory].[discountcategory]'
        managed = False  # Prevent Django from altering this table

# Add customer first page

class CustomerCitizenship(models.Model):
    country_rno = models.AutoField(primary_key=True)
    country = models.CharField(max_length=255)
    branch_rno = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = '[Inventory].[country]'
        managed = False  # Prevent Django from altering this table

class CustomerBillingtype(models.Model):
    billtype_rno = models.AutoField(primary_key=True)
    billtype = models.CharField(max_length=255)
    

    class Meta:
        db_table = '[Clinics].[billtype]'
        managed = False  # Prevent Django from altering this table

########

class CustomerTitle(models.Model):
    title_rno = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)
    branch_rno = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = '[Clinics].[title]'
        managed = False  # Prevent Django from altering this table



class CustomerCountry(models.Model):
    code= models.CharField(max_length=255,primary_key=True)
    description = models.CharField(max_length=255)
    

    class Meta:
        db_table = '[EInvoice].[countrycode]'
        managed = False  # Prevent Django from altering this table

class CustomerState(models.Model):
    code= models.CharField(max_length=255,primary_key=True)
    state = models.CharField(max_length=255)
    

    class Meta:
        db_table = '[EInvoice].[statecode]'
        managed = False  # Prevent Django from altering this table



class Panelcompany(models.Model):
    panelcomp_rno = models.AutoField(primary_key=True)
    pcompanyname = models.CharField(max_length=255)
    privatebranch_rno = models.IntegerField(null=True, blank=True)
    panelcomp_uid = models.UUIDField(db_column='panelcomp_uid') 
    pcompany_no = models.CharField(max_length=50, null=True, blank=True)
    ceilingcharge = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    createdby = models.CharField(max_length=100, null=True, blank=True)
    createdon = models.DateTimeField(auto_now_add=True)
    modifiedby = models.CharField(max_length=100, null=True, blank=True)
    modifiedon = models.DateTimeField(auto_now=True)

    corp_typerno = models.IntegerField(null=True, blank=True)
    address1 = models.CharField(max_length=255, null=True, blank=True)
    address2 = models.CharField(max_length=255, null=True, blank=True)
    address3 = models.CharField(max_length=255, null=True, blank=True)
    address4 = models.CharField(max_length=255, null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)
    town = models.CharField(max_length=100, null=True, blank=True)
    country = models.CharField(max_length=100, null=True, blank=True)
    postcode = models.CharField(max_length=20, null=True, blank=True)
    phone1 = models.CharField(max_length=50, null=True, blank=True)
    phone2 = models.CharField(max_length=50, null=True, blank=True)
    fax1 = models.CharField(max_length=50, null=True, blank=True)
    fax2 = models.CharField(max_length=50, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    contactperson = models.CharField(max_length=100, null=True, blank=True)

    default_ceiling = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    default_consultation = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    invoiceoption1 = models.CharField(max_length=50, null=True, blank=True)
    invoiceoption2 = models.CharField(max_length=50, null=True, blank=True)
    invoiceoption3 = models.CharField(max_length=50, null=True, blank=True)
    invoiceoption4 = models.CharField(max_length=50, null=True, blank=True)

    isactive = models.BooleanField(default=True)
    privatepanel = models.BooleanField(default=False)
    ischargectrlbydepartment = models.BooleanField(default=False)
    authorisation = models.CharField(max_length=255, null=True, blank=True)
    specialprecaution = models.TextField(null=True, blank=True)
    remark = models.TextField(null=True, blank=True)

    creditterms = models.IntegerField(null=True, blank=True)
    creditlimit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    prescriptionmarkup = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    prescriptionmarkuptype = models.CharField(max_length=50, null=True, blank=True)

    yearlymaxlimit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    monthlymaxlimit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    reporttemplate = models.CharField(max_length=100, null=True, blank=True)

    branch_uid = models.CharField(max_length=100, null=True, blank=True)
    stkitempricescheme = models.CharField(max_length=100, null=True, blank=True)
    svritempricescheme = models.CharField(max_length=100, null=True, blank=True)

    eBillEnabled = models.BooleanField(default=False)
    eBillCorp_rno = models.IntegerField(null=True, blank=True)
    eBillStartDate = models.DateTimeField(null=True, blank=True)
    eBillEndDate = models.DateTimeField(null=True, blank=True)

    eCorp_rno = models.IntegerField(null=True, blank=True)
    centerinvoiceprocess = models.BooleanField(default=False)
    maincompany_rno = models.IntegerField(null=True, blank=True)
    isconsultfeebytime = models.BooleanField(default=False)

    roundformula = models.CharField(max_length=50, null=True, blank=True)
    roundbyitem = models.BooleanField(default=False)
    roundbybillgroup = models.BooleanField(default=False)

    pcompanyTIN = models.CharField(max_length=50, null=True, blank=True)
    pcompanyRegNo = models.CharField(max_length=50, null=True, blank=True)
    pcompanySST = models.CharField(max_length=50, null=True, blank=True)
    pcompanyMSIC = models.CharField(max_length=50, null=True, blank=True)

    isstkitemmarkup = models.BooleanField(default=False)
    issvritemmarkup = models.BooleanField(default=False)

    othersysKeyNo = models.CharField(max_length=50, null=True, blank=True)
    practiceno = models.CharField(max_length=50, null=True, blank=True)

    pricebook_rno = models.IntegerField(null=True, blank=True)
    statecode = models.CharField(max_length=20, null=True, blank=True)
    countrycode = models.CharField(max_length=20, null=True, blank=True)
    statename = models.CharField(max_length=100, null=True, blank=True)

    NoNeedEInvoice = models.BooleanField(default=False)
    isTaxExempt = models.BooleanField(default=False)

    # datekeyin 要另外存
    datekeyin = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = '[Clinics].[panelcompany]'
        managed = False  # Prevent Django from altering this table


class department(models.Model):
    department_rno = models.AutoField(primary_key=True)
    department = models.CharField(max_length=255)
    branch_rno = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = '[Clinics].[department]'
        managed = False 


class doctor(models.Model):
    doctor_rno = models.AutoField(primary_key=True)
    doctorname = models.CharField(max_length=255)
    isactive = models.BooleanField(default=True)
    branch_rno = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = '[Clinics].[doctors]'
        managed = False 


class Customer(models.Model):
    customer_uid = models.UUIDField(db_column='customer_uid')
    customer_rno = models.CharField(max_length=50, primary_key=True)
    customerno = models.CharField(max_length=50, blank=True, null=True)
    name = models.CharField(max_length=255, blank=True, null=True)
    inv_address1 = models.CharField(max_length=255, blank=True, null=True)
    inv_address2 = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone1 = models.CharField(max_length=50, blank=True, null=True)
    icno = models.CharField(max_length=250, blank=True, null=True)
    createon = models.DateTimeField(blank=True, null=True)
    createdby = models.CharField(max_length=60, blank=True, null=True)
    
    inv_address3 = models.CharField(max_length=255, blank=True, null=True)
    inv_attention = models.CharField(max_length=255, blank=True, null=True)
    do_address1 = models.CharField(max_length=255, blank=True, null=True)
    do_address2 = models.CharField(max_length=255, blank=True, null=True)
    do_address3 = models.CharField(max_length=255, blank=True, null=True)
    do_attention = models.CharField(max_length=255, blank=True, null=True)
    
    website = models.CharField(max_length=255, blank=True, null=True)
    
    phone2 = models.CharField(max_length=50, blank=True, null=True)
    fax = models.CharField(max_length=50, blank=True, null=True)
    creditterms = models.CharField(max_length=50, blank=True, null=True)
    creditlimit = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    target = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    discountcategory = models.CharField(max_length=50, blank=True, null=True)
    currencycode = models.CharField(max_length=10, blank=True, null=True)
    currencysymbol = models.CharField(max_length=10, blank=True, null=True)
    currencyword = models.CharField(max_length=50, blank=True, null=True)
    customertype_rno = models.CharField(max_length=50, blank=True, null=True)
    customergrp_rno = models.CharField(max_length=50, blank=True, null=True)
    isGSTCustomer = models.BooleanField(default=False)
    accountstatus = models.BooleanField(default=False)
    bankacno = models.CharField(max_length=50, blank=True, null=True)
    invdiscount = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    provisiondiscount = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    createdby = models.CharField(max_length=100, blank=True, null=True)
    createon = models.DateTimeField(blank=True, null=True)
    modifiedby = models.CharField(max_length=100, blank=True, null=True)
    modifyon = models.DateTimeField(blank=True, null=True)
    remark = models.TextField(blank=True, null=True)
    icno = models.CharField(max_length=20, blank=True, null=True)
    gender = models.CharField(max_length=10, blank=True, null=True)
    mobileno1 = models.CharField(max_length=20, blank=True, null=True)
    mobileno2 = models.CharField(max_length=20, blank=True, null=True)
    medical_G6PD = models.BooleanField(default=False)
    medical_healthhistory = models.TextField(blank=True, null=True)
    medical_allergynote = models.TextField(blank=True, null=True)
    photo = models.TextField(blank=True, null=True)
    title = models.CharField(max_length=20, blank=True, null=True)
    patient_dateofbirth = models.DateTimeField(blank=True, null=True)
    patient_died = models.BooleanField(default=False)
    patient_diedat = models.DateTimeField(blank=True, null=True)
    patient_race = models.CharField(max_length=50, blank=True, null=True)
    patient_occupation = models.CharField(max_length=100, blank=True, null=True)
    patient_religion = models.CharField(max_length=50, blank=True, null=True)
    patient_maritalstatus = models.CharField(max_length=50, blank=True, null=True)
    patient_language = models.CharField(max_length=50, blank=True, null=True)
    patient_ethnic = models.CharField(max_length=50, blank=True, null=True)
    patient_spousename = models.CharField(max_length=100, blank=True, null=True)
    patient_issmoking = models.BooleanField(default=False)
    patient_referralby = models.CharField(max_length=100, blank=True, null=True)
    patient_yearofmarried = models.CharField(max_length=100, blank=True, null=True)
    patient_noofchildren = models.CharField(max_length=100, blank=True, null=True)
    patient_emergcontact = models.CharField(max_length=100, blank=True, null=True)
    patient_emergtel = models.CharField(max_length=20, blank=True, null=True)
    patient_emergrelationship = models.CharField(max_length=50, blank=True, null=True)
    patient_spouseoccup = models.CharField(max_length=100, blank=True, null=True)
    patient_corpbilltype = models.CharField(max_length=50, blank=True, null=True)
    corp_employmentno = models.CharField(max_length=50, blank=True, null=True)
    corp_department = models.CharField(max_length=100, blank=True, null=True)
    attachfolder = models.CharField(max_length=255, blank=True, null=True)
    panelcomp_rno = models.CharField(max_length=50, blank=True, null=True)
    
    opendate = models.DateTimeField(blank=True, null=True)
    isforeigner = models.BooleanField(default=False)
    country = models.CharField(max_length=100, blank=True, null=True)
    patient_postcode = models.CharField(max_length=10, blank=True, null=True)
    patient_fathername = models.CharField(max_length=100, blank=True, null=True)
    patient_fatheric = models.CharField(max_length=20, blank=True, null=True)
    patient_fatherrace = models.CharField(max_length=50, blank=True, null=True)
    patient_fatherreligion = models.CharField(max_length=50, blank=True, null=True)
    patient_mothername = models.CharField(max_length=100, blank=True, null=True)
    patient_motheric = models.CharField(max_length=20, blank=True, null=True)
    patient_motherrace = models.CharField(max_length=50, blank=True, null=True)
    patient_motherreligion = models.CharField(max_length=50, blank=True, null=True)
    reviewperiod = models.CharField(max_length=100, blank=True, null=True)
    branch_uid = models.CharField(max_length=50, blank=True, null=True)
    last4DIC = models.CharField(max_length=10, blank=True, null=True)
    membershipno = models.CharField(max_length=50, blank=True, null=True)
    patient_age = models.CharField(max_length=50, blank=True, null=True)
    stkitempricescheme = models.CharField(max_length=50, blank=True, null=True)
    svritempricescheme = models.CharField(max_length=50, blank=True, null=True)
    birthmonth = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    patient_spouseicno = models.CharField(max_length=20, blank=True, null=True)
    patient_spousecontact = models.CharField(max_length=20, blank=True, null=True)
    next2kin_rno = models.CharField(max_length=50, blank=True, null=True)
    next2kin_relationship = models.CharField(max_length=50, blank=True, null=True)
    next2kin_name = models.CharField(max_length=100, blank=True, null=True)
    customersourcename = models.CharField(max_length=100, blank=True, null=True)
    othentryno = models.CharField(max_length=50, blank=True, null=True)
    woman_gravida = models.CharField(max_length=100, blank=True, null=True)
    woman_para = models.CharField(max_length=100, blank=True, null=True)
    woman_abortion = models.CharField(max_length=100, blank=True, null=True)
    woman_lifechild = models.CharField(max_length=100, blank=True, null=True)
    woman_dealthchild = models.CharField(max_length=100, blank=True, null=True)
    woman_lastchildbirth = models.DateTimeField(blank=True, null=True)
    woman_menstrualstart = models.CharField(max_length=100, blank=True, null=True)
    woman_totalmenstrualdays = models.CharField(max_length=100, blank=True, null=True)
    woman_menstrualfreqweeks = models.CharField(max_length=100, blank=True, null=True)
    woman_totalmenstrualflow = models.CharField(max_length=100, blank=True, null=True)
    customerTIN = models.CharField(max_length=50, blank=True, null=True)
    customerRegNo = models.CharField(max_length=50, blank=True, null=True)
    customerMSIC = models.CharField(max_length=50, blank=True, null=True)
    customerSST = models.CharField(max_length=50, blank=True, null=True)
    pcompany_no = models.CharField(max_length=50, blank=True, null=True)
    cityname = models.CharField(max_length=100, blank=True, null=True)
    statecode = models.CharField(max_length=10, blank=True, null=True)
    statename = models.CharField(max_length=100, blank=True, null=True)
    countrycode = models.CharField(max_length=10, blank=True, null=True)
    MRN = models.CharField(max_length=50, blank=True, null=True)
    infant_birth_length = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    infant_birth_weight = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    infant_birth_hc = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    infant_tsh = models.CharField(max_length=50, blank=True, null=True)
    infant_perinatal = models.TextField(blank=True, null=True)
    infant_placeofbirth = models.CharField(max_length=255, blank=True, null=True)
    infant_deliverymode = models.CharField(max_length=50, blank=True, null=True)
    bloodtype = models.CharField(max_length=10, blank=True, null=True)
    IdentificationCategory = models.CharField(max_length=50, blank=True, null=True)
    taxpayer = models.BooleanField(default=False)
    taxpayericno = models.CharField(max_length=20, blank=True, null=True)
    citizenship = models.CharField(max_length=50, blank=True, null=True)
    
    branch = models.ForeignKey(
        Branch,
        on_delete=models.DO_NOTHING,
        db_column='branch_rno'  # 改成真实字段名
    )

    
    
    class Meta:
        managed = False
        db_table = '[Inventory].[customers]'

class ItemType(models.Model):
    itemtype_rno =  models.AutoField(primary_key=True)
    itemtype = models.CharField(max_length=255)
    branch_rno = models.IntegerField(null=True, blank=True)
    
    class Meta:
        managed = False
        db_table = '[Inventory].[itemtype]'

    def __str__(self):
        return self.name
class ItemGroup(models.Model):
    itemgrp_rno =  models.AutoField(primary_key=True)
    itemgroup = models.CharField(max_length=255)
    branch_rno = models.IntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = '[Inventory].[itemgroup]'

    def __str__(self):
        return self.name

class ItemCategory(models.Model):
    itemcategory_rno =  models.AutoField(primary_key=True)
    category = models.CharField(max_length=255)
    branch_rno = models.IntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = '[Inventory].[itemcategory]'

    def __str__(self):
        return self.name

class ItemBillGroup(models.Model):
    billgrp_rno =  models.AutoField(primary_key=True)
    billgrp_description = models.CharField(max_length=255)
    branch_rno = models.IntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = '[Clinics].[billing_group]'

    def __str__(self):
        return self.name
    
class ItemClassification(models.Model):
    code =  models.AutoField(primary_key=True)
    description = models.CharField(max_length=255)
  

    class Meta:
        managed = False
        db_table = '[Einvoice].[classficationcode]'

    def __str__(self):
        return self.name
    
class ItemFrequency(models.Model):
    fre_rno =  models.AutoField(primary_key=True)
    frequency = models.CharField(max_length=255)
    branch_rno = models.IntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = '[Clinics].[frequency]'

    def __str__(self):
        return self.name
    
class ItemDosage(models.Model):
    dosage_rno =  models.AutoField(primary_key=True)
    dosage = models.CharField(max_length=255)
    branch_rno = models.IntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = '[Clinics].[dosage]'

    def __str__(self):
        return self.name
    
class ItemPrecaution(models.Model):
    pre_rno =  models.AutoField(primary_key=True)
    precaution = models.CharField(max_length=255)
    branch_rno = models.IntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = '[Clinics].[precaution]'

    def __str__(self):
        return self.name
    
class ItemInstruction(models.Model):
    instruct_rno =  models.AutoField(primary_key=True)
    instruction = models.CharField(max_length=255)
    branch_rno = models.IntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = '[Clinics].[instruction]'

  
    
class ItemIndication(models.Model):
    indicate_rno =  models.AutoField(primary_key=True)
    indication = models.CharField(max_length=255)
    branch_rno = models.IntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = '[Clinics].[indication]'


    
class ItemSupplier(models.Model):
    supplier_rno =  models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    branch_rno = models.IntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = '[Inventory].[suppliers]'

  
    
class ItemUOM(models.Model):
    unit_rno =  models.AutoField(primary_key=True)
    unit = models.CharField(max_length=255)
    branch_rno = models.IntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = '[Inventory].[unit]'



class ItemTax(models.Model):
    svrtaxcode =  models.AutoField(primary_key=True)
    description = models.CharField(max_length=255)
    

    class Meta:
        managed = False
        db_table = '[dbo].[servicetax]'
