/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/search', 'N/log', 'N/format', 'N/record', 'N/url', 'N/redirect'], function (serverWidget, search, log, format, record, url, redirect) {
    function onRequest(context) {
        var parameters = context.request.parameters;
        var filterDate = parameters.filter_date || '';
        var filterType = parameters.filter_type || '';

        if (context.request.method === 'GET') {
            var form = serverWidget.createForm({
                title: 'Assets Installation'
            });
            form.clientScriptModulePath = '/SuiteScripts/InstallationSuitelet_Client.js';

            var assetTab = form.addTab({
                id: 'custpage_asset_tab',
                label: 'Asset Installation'
            });

            var sublist = form.addSublist({
                id: 'custpage_assets_sublist',
                type: serverWidget.SublistType.INLINEEDITOR,
                label: 'Assets to Allocate',
                tab: 'custpage_asset_tab'
            });

            var assetField = sublist.addField({
                id: 'custpage_asset',
                type: serverWidget.FieldType.SELECT,
                label: 'Asset'
            });

            var assets = getFilteredAssets();
            assetField.addSelectOption({ value: '', text: '' }); // Add blank option
            assets.forEach(function (asset) {
                assetField.addSelectOption({
                    value: asset.value,
                    text: asset.text
                });
            });

            var costField = sublist.addField({
                id: 'custpage_asset_cost',
                type: serverWidget.FieldType.CURRENCY,
                label: 'Current Net Book Value'
            });
            costField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });

            var transactionCostSubtab = form.addSubtab({
                id: 'custpage_transaction_cost_subtab',
                label: 'Transaction Cost'
            });

            var transactionCostTab = form.addTab({
                id: 'custpage_transactions_subtab',
                label: 'Transaction Costs'
            });

            var startDateField = form.addField({
                id: 'custpage_start_date',
                type: serverWidget.FieldType.DATE,
                label: 'Transaction Date'
            });

            var now = new Date();
            var firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            startDateField.defaultValue = filterDate ? formatDate(filterDate) : format.format({
                value: firstDayCurrentMonth,
                type: format.Type.DATE
            });

            var transactionSublist = form.addSublist({
                id: 'custpage_transaction_sublist',
                type: serverWidget.SublistType.INLINEEDITOR,
                label: 'Select Transactions',
                tab: 'custpage_transactions_subtab'
            });

            var transactionField = transactionSublist.addField({
                id: 'custpage_transaction_select',
                type: serverWidget.FieldType.SELECT,
                label: 'Transaction'
            });

            transactionField.addSelectOption({ value: '', text: '' }); // Add blank option
            var transactions = getTransactions(filterDate, filterType);
            transactions.forEach(function (transaction) {
                var optionText = transaction.text + ' - LineID: ' + transaction.lineuniquekey;
                transactionField.addSelectOption({
                    value: transaction.value + '-' + transaction.lineuniquekey,
                    text: optionText
                });
            });

            form.addSubmitButton({
                label: 'Submit'
            });

            var filterDateField = form.addField({
                id: 'custpage_filter_date',
                type: serverWidget.FieldType.DATE,
                label: 'Filter Date'
            });
            filterDateField.defaultValue = filterDate ? formatDate(filterDate) : '';

            var filterTypeField = form.addField({
                id: 'custpage_filter_type',
                type: serverWidget.FieldType.SELECT,
                label: 'Filter Type'
            });
            filterTypeField.addSelectOption({ value: '', text: '' });
            filterTypeField.addSelectOption({ value: 'VendBill', text: 'Vendor Bill' });
            filterTypeField.addSelectOption({ value: 'Journal', text: 'Journal Entry' });
            filterTypeField.addSelectOption({ value: 'ExpRept', text: 'Expense Report' });
            filterTypeField.defaultValue = filterType;

            form.addButton({
                id: 'custpage_apply_filters',
                label: 'Apply Filters',
                functionName: 'applyFilters'
            });

            context.response.writePage(form);
        } else {
            try {
                var subsidiaryId = 12;
                var currencyId = 1;
                var transactionDate = context.request.parameters.custpage_start_date;

                log.debug('POST Parameters', {
                    subsidiaryId: subsidiaryId,
                    currencyId: currencyId,
                    transactionDate: transactionDate
                });

                var transactionRecord = record.create({
                    type: 'customtransaction107',
                    isDynamic: true
                });

                transactionRecord.setValue('subsidiary', subsidiaryId);
                transactionRecord.setValue('currency', currencyId);
                transactionRecord.setValue('trandate', new Date(transactionDate));

                var totalCreditAmount = 0;
                var assetLines = [];
                var assetCount = context.request.getLineCount({ group: 'custpage_assets_sublist' });
                var transactionCount = context.request.getLineCount({ group: 'custpage_transaction_sublist' });

                log.debug('Counts', {
                    assetCount: assetCount,
                    transactionCount: transactionCount
                });

                var selectedAssets = {};
                var selectedTransactions = {};

                for (var i = 0; i < transactionCount; i++) {
                    var transactionValue = context.request.getSublistValue({
                        group: 'custpage_transaction_sublist',
                        name: 'custpage_transaction_select',
                        line: i
                    });

                    log.debug('Transaction Value', transactionValue); // Log transaction value

                    if (!transactionValue) continue; // Skip empty lines

                    var [transactionId, lineUniqueKey] = transactionValue.split('-');
                    var transactionUniqueId = transactionId + '-' + lineUniqueKey;

                    if (selectedTransactions[transactionUniqueId]) {
                        throw new Error('Duplicate transaction line selected: ' + transactionUniqueId);
                    }
                    selectedTransactions[transactionUniqueId] = true;

                    var transactionType = search.lookupFields({
                        type: 'transaction',
                        id: transactionId,
                        columns: ['type']
                    }).type[0].value;

                    // Map the returned type to the correct record type
                    if (transactionType === 'Journal') {
                        transactionType = 'journalentry';
                    } else if (transactionType === 'VendBill') {
                        transactionType = 'vendorbill';
                    } else if (transactionType === 'ExpRept') {
                        transactionType = 'expensereport';
                    }

                    log.debug('Transaction Details', {
                        transactionId: transactionId,
                        lineUniqueKey: lineUniqueKey,
                        transactionType: transactionType
                    });

                    var transactionSearch = search.create({
                        type: 'transaction',
                        filters: [
                            ['lineuniquekey', search.Operator.EQUALTO, lineUniqueKey]
                        ],
                        columns: [
                            'account',
                            'debitamount',
                            'line'
                        ]
                    });

                    var transactionResults = transactionSearch.run().getRange({ start: 0, end: 1 });
                    if (transactionResults.length > 0) {
                        var accountId = transactionResults[0].getValue('account');
                        var debitAmount = transactionResults[0].getValue('debitamount');
                        var lineIndex = transactionResults[0].getValue('line');

                        log.debug('Transaction Line Details', {
                            accountId: accountId,
                            debitAmount: debitAmount,
                            lineIndex: lineIndex
                        });

                        transactionRecord.selectNewLine({ sublistId: 'line' });
                        transactionRecord.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'account',
                            value: accountId
                        });
                        transactionRecord.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'credit',
                            value: debitAmount
                        });
                        transactionRecord.commitLine({ sublistId: 'line' });

                        totalCreditAmount += parseFloat(debitAmount);

                        var transaction = record.load({
                            type: transactionType,
                            id: transactionId
                        });

                        transaction.setSublistValue({
                            sublistId: 'line',
                            fieldId: 'custcol_asset_ins_journal',
                            line: parseInt(lineIndex, 10) - 1, // Use the line index from search
                            value: transactionRecord.id
                        });
                        transaction.save();

                        log.debug('Updated Transaction', {
                            transactionId: transactionId,
                            lineIndex: lineIndex,
                            journalId: transactionRecord.id
                        });
                    } else {
                        throw new Error('Unable to find transaction line details.');
                    }
                }

                for (var j = 0; j < assetCount; j++) {
                    var assetId = context.request.getSublistValue({
                        group: 'custpage_assets_sublist',
                        name: 'custpage_asset',
                        line: j
                    });

                    if (!assetId) continue; // Skip empty lines

                    if (selectedAssets[assetId]) {
                        throw new Error('Duplicate asset selected: ' + assetId);
                    }
                    selectedAssets[assetId] = true;

                    var asset = record.load({
                        type: 'customrecord_ncfar_asset',
                        id: assetId
                    });

                    var mainAccountId = asset.getValue('custrecord_assetmainacc');
                    assetLines.push({
                        assetId: assetId,
                        mainAccountId: mainAccountId
                    });

                    log.debug('Asset Details', {
                        assetId: assetId,
                        mainAccountId: mainAccountId
                    });
                }

                if (Object.keys(selectedAssets).length === 0) {
                    throw new Error('At least one asset must be selected.');
                }

                if (Object.keys(selectedTransactions).length === 0) {
                    throw new Error('At least one transaction line must be selected.');
                }

                // Calculate debit amount per asset and round to 2 decimal places
                var debitAmountPerAsset = parseFloat((totalCreditAmount / assetLines.length).toFixed(2));
                log.debug('Debit Amount Per Asset', debitAmountPerAsset);

                var totalDebitAmount = 0;

                assetLines.forEach(function (assetLine, index) {
                    var debitAmount = debitAmountPerAsset;

                    // If it's the last asset line, adjust the debit amount to balance the credits and debits
                    if (index === assetLines.length - 1) {
                        var remainingDifference = totalCreditAmount - totalDebitAmount;
                        if (Math.abs(remainingDifference - debitAmount) < 1) {
                            debitAmount = remainingDifference;
                        }
                    }

                    transactionRecord.selectNewLine({ sublistId: 'line' });
                    transactionRecord.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'account',
                        value: assetLine.mainAccountId
                    });
                    transactionRecord.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'debit',
                        value: debitAmount
                    });
                    transactionRecord.commitLine({ sublistId: 'line' });

                    totalDebitAmount += debitAmount;
                });

                var transactionId = transactionRecord.save();
                log.debug('Transaction Created', 'Transaction ID: ' + transactionId);

                assetLines.forEach(function (assetLine) {
                    var asset = record.load({
                        type: 'customrecord_ncfar_asset',
                        id: assetLine.assetId
                    });

                    var currentCost = asset.getValue('custrecord_assetcurrentcost');
                    var currentNBV = asset.getValue('custrecord_assetbookvalue');

                    var newCost = currentCost + debitAmountPerAsset;
                    var newNBV = currentNBV + debitAmountPerAsset;
                    log.debug('Updating Asset', {
                        assetId: assetLine.assetId,
                        currentCost: currentCost,
                        newCost: newCost,
                        currentNBV: currentNBV,
                        newNBV: newNBV
                    });
                    asset.setValue('custrecord_assetcurrentcost', newCost);
                    asset.setValue('custrecord_assetbookvalue', newNBV);
                    asset.setValue('custrecord_asset_allctinstalation', transactionId);
                    asset.save();
                });

                redirect.toRecord({
                    type: 'customtransaction107',
                    id: transactionId
                });

            } catch (e) {
                log.error('Error Processing Asset Installation', e.message);
                var errorForm = serverWidget.createForm({
                    title: 'Error Processing Asset Installation'
                });
                errorForm.addField({
                    id: 'custpage_message',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'Error'
                }).defaultValue = '<h2>An error occurred while processing the asset installation: ' + e.message + '</h2>';

                context.response.writePage(errorForm);
            }
        }
    }

    function formatDate(dateString) {
        var date = new Date(dateString);
        return format.format({
            value: date,
            type: format.Type.DATE
        });
    }

    function getFilteredAssets() {
        var options = [];
        var assetSearch = search.create({
            type: 'customrecord_ncfar_asset',
            filters: [
                ['custrecord_asset_allctstatus', search.Operator.ANYOF, '2']
            ],
            columns: [
                search.createColumn({ name: 'internalid' }),
                search.createColumn({ name: 'name' }),
                search.createColumn({ name: 'altname' }),
                search.createColumn({ name: 'custrecord_assetcurrentcost' })
            ]
        });

        assetSearch.run().each(function (result) {
            var name = result.getValue({ name: 'name' });
            var altName = result.getValue({ name: 'altname' });
            var cost = result.getValue({ name: 'custrecord_assetcurrentcost' });
            var displayName = name + (altName ? ' (' + altName + ')' : '');
            options.push({
                value: result.getValue({ name: 'internalid' }),
                text: displayName
            });
            return true;
        });

        return options;
    }

    function getTransactions(filterDate, filterType) {
        var now = new Date();
        var startOfYear = new Date(now.getFullYear(), 0, 1);

        var filters = [
            ['subsidiary', search.Operator.ANYOF, '12'],
            'AND',
            ['trandate', search.Operator.ONORAFTER, format.format({
                value: startOfYear,
                type: format.Type.DATE
            })],
            'AND',
            ['type', search.Operator.ANYOF, ['VendBill', 'Journal', 'ExpRept']],
            'AND',
            ['account', search.Operator.ANYOF, '1111'],
            'AND',
            ['posting', search.Operator.IS, true],
            'AND',
            ['debitamount', search.Operator.ISNOTEMPTY, ''],
            'AND',
            ['custcol_asset_ins_journal', search.Operator.ISEMPTY, '']
        ];

        if (filterDate) {
            filters.push('AND', ['trandate', search.Operator.ONORAFTER, format.parse({
                value: filterDate,
                type: format.Type.DATE
            })]);
        }

        if (filterType) {
            filters.push('AND', ['type', search.Operator.ANYOF, [filterType]]);
        }

        var options = [];
        var transactionSearch = search.create({
            type: search.Type.TRANSACTION,
            filters: filters,
            columns: [
                search.createColumn({ name: 'tranid' }),
                search.createColumn({ name: 'type' }),
                search.createColumn({ name: 'account' }),
                search.createColumn({ name: 'debitamount' }),
                search.createColumn({ name: 'lineuniquekey' })
            ]
        });

        transactionSearch.run().each(function (result) {
            options.push({
                value: result.id,
                text: result.getText({ name: 'type' }) + ' ' + result.getValue({ name: 'tranid' }) + ' - ' + result.getText({ name: 'account' }) + ' $ ' + result.getValue({ name: 'debitamount' }),
                lineuniquekey: result.getValue({ name: 'lineuniquekey' })
            });
            return true;
        });

        return options;
    }

    return {
        onRequest: onRequest
    };
});
