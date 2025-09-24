$(document).ready(function() {
            // 生成示例数据
            function generateSampleData(rowCount = 50) {
                const statuses = ['Pending', 'Completed', 'Cancelled'];
                const doctors = ['张医生', '李医生', '王医生', '刘医生', '陈医生'];
                const genders = ['Male', 'Female'];
                const billingTypes = ['Cash', 'Insurance', 'Corporate'];
                const panelCompanies = ['Company A', 'Company B', 'Company C', 'None'];
                const complaints = ['Headache', 'Fever', 'Stomach pain', 'Back pain', 'Routine checkup'];
                
                const data = [];
                for (let i = 1; i <= rowCount; i++) {
                    const status = statuses[Math.floor(Math.random() * statuses.length)];
                    const doctor = doctors[Math.floor(Math.random() * doctors.length)];
                    const gender = genders[Math.floor(Math.random() * genders.length)];
                    const billingType = billingTypes[Math.floor(Math.random() * billingTypes.length)];
                    const panelCompany = panelCompanies[Math.floor(Math.random() * panelCompanies.length)];
                    const complaint = complaints[Math.floor(Math.random() * complaints.length)];
                    
                    data.push([
                        i, // No.
                        `<div class="btn-group">
                            <button class="btn btn-sm btn-primary action-btn"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-danger action-btn"><i class="fas fa-trash"></i></button>
                         </div>`, // Action
                        `Patient ${i}`, // Name
                        `<span class="status-badge status-${status.toLowerCase()}">${status}</span>`, // Status
                        Math.random() > 0.5 ? 'Submitted' : 'Pending', // eInvoice Status
                        `2023-09-${Math.floor(Math.random() * 30) + 1}`, // Date
                        `TKT${1000 + i}`, // Ticket
                        Math.floor(Math.random() * 20) + 1, // Queue
                        `Room ${Math.floor(Math.random() * 10) + 1}`, // Room
                        Math.random() > 0.5 ? 'Morning' : 'Afternoon', // Shift
                        `CUST${10000 + i}`, // Customer No.
                        `IC${800000 + i}`, // IC or Passport
                        gender, // Gender
                        Math.floor(Math.random() * 80) + 18, // Age on date
                        billingType, // Billing Type
                        panelCompany, // Panel Company
                        doctor, // Doctor Name
                        Math.random() > 0.7 ? 'Yes' : 'No', // M.C
                        Math.random() > 0.5 ? 'Yes' : 'No', // Buy Product
                        (Math.random() * 500 + 50).toFixed(2), // Total Amount
                        (Math.random() * 500 + 50).toFixed(2), // Customer Pay
                        (Math.random() * 300).toFixed(2), // Corp Pay
                        (Math.random() * 500 + 50).toFixed(2), // Paid Amount
                        (Math.random() * 300).toFixed(2), // Cash Amt
                        (Math.random() * 300).toFixed(2), // Card Amt
                        (Math.random() * 100).toFixed(2), // Cheque Amt
                        (Math.random() * 200).toFixed(2), // E-wallet
                        (Math.random() * 200).toFixed(2), // Online Amt
                        complaint, // Complaint/Remark
                        `CH${1000 + i}`, // Chit No.
                        `Staff ${Math.floor(Math.random() * 10) + 1}`, // Dispensary checked by
                        `2023-10-${Math.floor(Math.random() * 30) + 1}`, // Next Appointment Date
                        `${Math.floor(Math.random() * 60) + 5} mins`, // Waiting Time (IN)
                        Math.random() > 0.5 ? 'In-person' : 'Teleconsultation', // Consult type
                        Math.random() > 0.5 ? 'Yes' : 'No', // Einvoice Submitted
                        `Remark for patient ${i}`, // Customer Remark
                        Math.random() > 0.8 ? 'Yes' : 'No', // Foreigner
                        `User${Math.floor(Math.random() * 5) + 1}` // Counsuly Current Access by
                    ]);
                }
                return data;
            }

            // 初始化DataTable
            var table = $('#appointments-table').DataTable({
                data: generateSampleData(),
                scrollY: '500px',
                scrollX: true,
                scrollCollapse: true,
                fixedColumns: {
                    left: 2 // 固定前两列（No.和Action）
                },
                paging: true,
                pageLength: 10,
                lengthMenu: [10, 25, 50, 100],
                dom: 'lrtip', // 隐藏默认搜索框，因为我们有自己的
                columnDefs: [
                    { width: '60px', targets: 0 }, // No.列宽
                    { width: '80px', targets: 1 }, // Action列宽
                    { width: '120px', targets: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] }, // 其他列宽
                    { className: 'dt-head-center', targets: '_all' }, // 表头居中
                    { orderable: false, targets: 1 } // Action列不可排序
                ],
                language: {
                    lengthMenu: "显示 _MENU_ 条记录",
                    zeroRecords: "没有找到记录",
                    info: "显示第 _START_ 至 _END_ 项结果，共 _TOTAL_ 项",
                    infoEmpty: "显示第 0 至 0 项结果，共 0 项",
                    infoFiltered: "(由 _MAX_ 项结果过滤)",
                    search: "搜索:",
                    paginate: {
                        first: "首页",
                        previous: "上一页",
                        next: "下一页",
                        last: "末页"
                    }
                }
            });

            // 自定义搜索
            $('#searchInput').on('keyup', function() {
                table.search(this.value).draw();
            });

            // 状态过滤
            $('#statusFilter').on('change', function() {
                table.column(3).search(this.value).draw();
            });

            // 医生过滤
            $('#doctorFilter').on('change', function() {
                table.column(16).search(this.value).draw();
            });

            // 日期过滤
            $('#dateFilter').on('change', function() {
                table.column(5).search(this.value).draw();
            });
        });