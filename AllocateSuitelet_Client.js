/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['N/url', 'N/currentRecord', 'N/record', 'N/search'], function(url, currentRecord, record, search) {

    function fieldChanged(context) {
        var rec = context.currentRecord;
        var fieldId = context.fieldId;

        // Check if the change is in the 'custpage_type_field', 'custpage_to_customer', 'custpage_from_customer', 'custpage_to_site', or 'custpage_from_site'
        if (fieldId === 'custpage_type_field' || fieldId === 'custpage_to_customer' || fieldId === 'custpage_from_customer' || fieldId === 'custpage_to_site' || fieldId === 'custpage_from_site') {
            var type = rec.getValue('custpage_type_field');
            var date = rec.getValue('custpage_date_field');
            var toCustomer = rec.getValue('custpage_to_customer');
            var fromCustomer = rec.getValue('custpage_from_customer');
            var toSite = rec.getValue('custpage_to_site');
            var fromSite = rec.getValue('custpage_from_site');

            // Format the date parameter
            var formattedDate = date ? formatDateForURL(date) : '';

            // Redirect to the Suitelet with the type, date, and customer parameters
            var suiteletUrl = url.resolveScript({
                scriptId: 'customscript1357',
                deploymentId: 'customdeploy1',
                params: {
                    type: type,
                    date: formattedDate,
                    toCustomer: toCustomer,
                    fromCustomer: fromCustomer,
                    toSite: toSite,
                    fromSite: fromSite
                }
            });

            window.location.href = suiteletUrl;
        }

        // Ensure unique asset selection in the sublist
        if (context.sublistId === 'custpage_assets_sublist' && fieldId === 'custpage_asset') {
            var selectedAssets = [];
            var lineCount = rec.getLineCount({ sublistId: 'custpage_assets_sublist' });

            for (var i = 0; i < lineCount; i++) {
                if (i !== context.line) {
                    var asset = rec.getSublistValue({
                        sublistId: 'custpage_assets_sublist',
                        fieldId: 'custpage_asset',
                        line: i
                    });
                    selectedAssets.push(asset);
                }
            }

            var currentAsset = rec.getCurrentSublistValue({
                sublistId: 'custpage_assets_sublist',
                fieldId: 'custpage_asset'
            });

            if (selectedAssets.includes(currentAsset)) {
                alert('This asset has already been selected. Please choose a different asset.');
                rec.setCurrentSublistValue({
                    sublistId: 'custpage_assets_sublist',
                    fieldId: 'custpage_asset',
                    value: ''
                });
            } else {
                // Set default value for Qty to 1
                rec.setCurrentSublistValue({
                    sublistId: 'custpage_assets_sublist',
                    fieldId: 'custpage_qty',
                    value: 1
                });

                // Get the current cost for the selected asset
                var AssetBookValue = getAssetBookValue(currentAsset);
                rec.setCurrentSublistValue({
                    sublistId: 'custpage_assets_sublist',
                    fieldId: 'custpage_amount',
                    value: AssetBookValue
                });
                // Add Asset Name EA
                var AssetName = getAssetName(currentAsset);
                rec.setCurrentSublistValue({
                sublistId: 'custpage_assets_sublist',
                fieldId: 'custpage_asset_name',
                value: AssetName
                });
            }
        }
    }

    function getAssetBookValue(assetId) {
        if (!assetId) return 0;

        var lookup = search.lookupFields({
            type: 'customrecord_ncfar_asset',
            id: assetId,
            columns: ['custrecord_assetbookvalue']
        });

        return lookup.custrecord_assetbookvalue || 0;
    }
    //Get Asset Name
    function getAssetName(assetId) {
        if (!assetId) return 0;

        var lookup = search.lookupFields({
            type: 'customrecord_ncfar_asset',
            id: assetId,
            columns: ['custrecord_assetserialno']
        });        
        return lookup.custrecord_assetserialno || 0;
    }

    function formatDateForURL(date) {
        var month = '' + (date.getMonth() + 1);
        var day = '' + date.getDate();
        var year = date.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;

        return [year, month, day].join('-');
    }

    return {
        fieldChanged: fieldChanged
    };
});
