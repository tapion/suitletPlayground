/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */

define(['N/ui/serverWidget'], function(serverWidget) {

    function onRequest(context) {
        if (context.request.method === 'GET') {
            // Create a form
            var form = serverWidget.createForm({
                title: 'Asset Information'
            });

            // Add fields to the form
            var periodField = form.addField({
                id: 'custpage_period',
                type: serverWidget.FieldType.SELECT,
                label: 'Period'
            });
            // Add options to the period select field
            periodField.addSelectOption({
                value: 'January',
                text: 'January'
            });
            periodField.addSelectOption({
                value: 'February',
                text: 'February'
            });
            // Add more months as needed...

            var customerField = form.addField({
                id: 'custpage_customer',
                type: serverWidget.FieldType.SELECT,
                label: 'Customer',
                source: 'customer' // This will fetch customers from NetSuite
            });

            // Add sublist for assets
            var assetSublist = form.addSublist({
                id: 'custpage_asset_sublist',
                type: serverWidget.SublistType.LIST,
                label: 'Assets'
            });

            assetSublist.addField({
                id: 'custpage_asset_checkbox',
                type: serverWidget.FieldType.CHECKBOX,
                label: 'Select'
            });

            assetSublist.addField({
                id: 'custpage_asset_name',
                type: serverWidget.FieldType.TEXT,
                label: 'Asset Name'
            });

            // Add your other asset fields as needed...

            // Add a submit button
            form.addSubmitButton({
                label: 'Submit'
            });

            // Send the response with the form
            context.response.writePage(form);
        } else {
            // Handle form submission
            var period = context.request.parameters.custpage_period;
            var customer = context.request.parameters.custpage_customer;

            // Process assets sublist data
            var assetCount = context.request.getLineCount({
                group: 'custpage_asset_sublist'
            });

            for (var i = 0; i < assetCount; i++) {
                var isSelected = context.request.getSublistValue({
                    group: 'custpage_asset_sublist',
                    name: 'custpage_asset_checkbox',
                    line: i
                });

                if (isSelected === 'T') {
                    var assetName = context.request.getSublistValue({
                        group: 'custpage_asset_sublist',
                        name: 'custpage_asset_name',
                        line: i
                    });

                    // Do something with the selected asset
                    // For example, you can create a record or perform any other operation
                    log.debug('Selected Asset Name', assetName);
                }
            }

            // Redirect or show a confirmation message
            context.response.write('Form submitted successfully!');
        }
    }

    return {
        onRequest: onRequest
    };

});
