// Copyright (c) 2025, PK and contributors
// For license information, please see license.txt

frappe.query_reports["Unified Report For Vouchers"] = {
    filters: [
        { fieldname: "from_date", label: __("From Date"), fieldtype: "Date" },
        { fieldname: "to_date", label: __("To Date"), fieldtype: "Date" },
        {
            fieldname: "voucher_type",
            label: __("Voucher Type"),
            fieldtype: "Select",
            options: ["", "Sales Order", "Purchase Order", "Sales Invoice", "Purchase Invoice", "Delivery Note", "Purchase Receipt"]
        },
        {
            fieldname: "status",
            label: __("Status"),
            fieldtype: "Select",
            options: ["", "Draft", "To Deliver and Bill", "To Bill", "To Deliver", "Completed", "Cancelled", "Overdue"]
        },
        {
            fieldname: "customer",
            label: __("Customer"),
            fieldtype: "Link",
            options: "Customer",
            depends_on: "eval:in_list(['Sales Order','Sales Invoice','Delivery Note'], frappe.query_report.get_filter_value('voucher_type'))"
        },
        {
            fieldname: "customer_group",
            label: __("Customer Group"),
            fieldtype: "Link",
            options: "Customer Group",
            depends_on: "eval:in_list(['Sales Order','Sales Invoice','Delivery Note'], frappe.query_report.get_filter_value('voucher_type'))"
        },
        {
            fieldname: "supplier",
            label: __("Supplier"),
            fieldtype: "Link",
            options: "Supplier",
            depends_on: "eval:in_list(['Purchase Order','Purchase Invoice','Purchase Receipt'], frappe.query_report.get_filter_value('voucher_type'))"
        },
        {
            fieldname: "supplier_group",
            label: __("Supplier Group"),
            fieldtype: "Link",
            options: "Supplier Group",
            depends_on: "eval:in_list(['Purchase Order','Purchase Invoice','Purchase Receipt'], frappe.query_report.get_filter_value('voucher_type'))"
        }
    ],

    formatter: function (value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);

        if (column.fieldname === "actions" && data) {
            value = `
                <button class="btn btn-xs btn-primary"
                    onclick="frappe.call({
                        method:'demo.demo.report.unified_report_for_voucher.unified_report_for_voucher.update_entry',
                        args:{voucher_no:'${data.voucher_no}', voucher_type:'${data.voucher_type}'},
                        callback:function(r){ frappe.msgprint(r.message); }
                    })">
                    Update
                </button>
                <button class="btn btn-xs btn-success"
                    onclick="frappe.call({
                        method:'demo.demo.report.unified_report_for_voucher.unified_report_for_voucher.create_entry',
                        args:{voucher_no:'${data.voucher_no}', voucher_type:'${data.voucher_type}'},
                        callback:function(r){ frappe.msgprint(r.message); }
                    })">
                    Create
                </button>`;
        }

        if (column.fieldname === "view_items" && data) {
            value = `
                <button class="btn btn-xs btn-info"
                    onclick="frappe.call({
                        method:'demo.demo.report.unified_report_for_voucher.unified_report_for_voucher.get_items',
                        args:{voucher_no:'${data.voucher_no}', voucher_type:'${data.voucher_type}'},
                        callback:function(r){
                            if(r.message){
                                frappe.msgprint({
                                    title:"Items for ${data.voucher_no}",
                                    message:r.message,
                                    indicator:"blue"
                                });
                            }
                        }
                    })">
                    View
                </button>`;
        }

        return value;
    }
};
