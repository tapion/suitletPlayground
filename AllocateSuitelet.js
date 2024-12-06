/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define([
  "N/ui/serverWidget",
  "N/record",
  "N/redirect",
  "N/url",
  "N/search",
  "N/format",
], function (serverWidget, record, redirect, url, search, format) {
  function onRequest(context) {
    var typeParam = context.request.parameters.type || "";
    var dateParam = context.request.parameters.date || "";
    var toCustomerParam = context.request.parameters.toCustomer || "";
    var fromCustomerParam = context.request.parameters.fromCustomer || "";
    var toSiteParam = context.request.parameters.toSite || "";
    var fromSiteParam = context.request.parameters.fromSite || "";

    if (context.request.method === "GET") {
      // Create the main asset allocation form
      var form = serverWidget.createForm({
        title: "Assets Allocation",
      });

      // Setting the client script path
      form.clientScriptModulePath = "/SuiteScripts/AllocateSuitelet_Client.js";

      // Create the Main group for Date and Type
      var mainGroup = form.addFieldGroup({
        id: "custpage_main_group",
        label: "Main",
      });

      // Date field
      var dateField = form.addField({
        id: "custpage_date_field",
        type: serverWidget.FieldType.DATE,
        label: "Date",
        container: "custpage_main_group",
      });

      // Set the value of the date field if dateParam is provided
      if (dateParam) {
        var formattedDate = parseDate(dateParam);
        if (formattedDate) {
          dateField.defaultValue = formattedDate;
        } else {
          log.error("Date Parsing Error", "Invalid date format: " + dateParam);
        }
      }

      // Dropdown list for Type
      var typeField = form.addField({
        id: "custpage_type_field",
        type: serverWidget.FieldType.SELECT,
        label: "Type",
        container: "custpage_main_group",
      });
      typeField.addSelectOption({
        value: "",
        text: "Select",
      });
      typeField.addSelectOption({
        value: "warehouse",
        text: "From Warehouse",
      });
      typeField.addSelectOption({
        value: "customer",
        text: "From Customer",
      });
      typeField.addSelectOption({
        value: "between",
        text: "Between Customers",
      });

      // Set the value of type field if typeParam is provided
      if (typeParam) {
        typeField.defaultValue = typeParam;
      }

      // Create field group for Allocation Info
      var allocationInfoGroup = form.addFieldGroup({
        id: "custpage_allocation_info_group",
        label: "Allocation Info",
      });

      // Conditional fields in the group with column breaks
      var fromCustomerField = form.addField({
        id: "custpage_from_customer",
        type: serverWidget.FieldType.SELECT,
        label: "From Customer",
        source: "customer",
        container: "custpage_allocation_info_group",
      });

      if (fromCustomerParam) {
        fromCustomerField.defaultValue = fromCustomerParam;
      }

      var fromSiteField = form.addField({
        id: "custpage_from_site",
        type: serverWidget.FieldType.SELECT,
        label: "From Site",
        container: "custpage_allocation_info_group",
      });

      // Add a column break between From and To fields
      form.addField({
        id: "custpage_column_break",
        type: serverWidget.FieldType.INLINEHTML,
        label: " ",
        container: "custpage_allocation_info_group",
      }).defaultValue = "<br><br>"; // Add some spacing

      var toCustomerField = form.addField({
        id: "custpage_to_customer",
        type: serverWidget.FieldType.SELECT,
        label: "To Customer",
        source: "customer",
        container: "custpage_allocation_info_group",
      });

      if (toCustomerParam) {
        toCustomerField.defaultValue = toCustomerParam;
      }

      var toSiteField = form.addField({
        id: "custpage_to_site",
        type: serverWidget.FieldType.SELECT,
        label: "To Site",
        container: "custpage_allocation_info_group",
      });

      var totalField = form.addField({
        id: "custpage_total_amount",
        type: serverWidget.FieldType.CURRENCY,
        label: "Total Amount",
        container: "custpage_allocation_info_group",
      });
      
      totalField.defaultValue = "0.00";
      totalField.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.INLINE,
      });

      // Populate site options based on customer parameters
      populateSiteOptions(toCustomerParam, toSiteField, toSiteParam);
      populateSiteOptions(fromCustomerParam, fromSiteField, fromSiteParam);

      // Set visibility based on typeParam
      if (typeParam === "warehouse") {
        toCustomerField.updateDisplayType({
          displayType: serverWidget.FieldDisplayType.NORMAL,
        });
        toSiteField.updateDisplayType({
          displayType: serverWidget.FieldDisplayType.NORMAL,
        });
        fromCustomerField.updateDisplayType({
          displayType: serverWidget.FieldDisplayType.HIDDEN,
        });
        fromSiteField.updateDisplayType({
          displayType: serverWidget.FieldDisplayType.HIDDEN,
        });
      } else if (typeParam === "customer") {
        toCustomerField.updateDisplayType({
          displayType: serverWidget.FieldDisplayType.HIDDEN,
        });
        toSiteField.updateDisplayType({
          displayType: serverWidget.FieldDisplayType.HIDDEN,
        });
        fromCustomerField.updateDisplayType({
          displayType: serverWidget.FieldDisplayType.NORMAL,
        });
        fromSiteField.updateDisplayType({
          displayType: serverWidget.FieldDisplayType.NORMAL,
        });
      } else if (typeParam === "between") {
        toCustomerField.updateDisplayType({
          displayType: serverWidget.FieldDisplayType.NORMAL,
        });
        toSiteField.updateDisplayType({
          displayType: serverWidget.FieldDisplayType.NORMAL,
        });
        fromCustomerField.updateDisplayType({
          displayType: serverWidget.FieldDisplayType.NORMAL,
        });
        fromSiteField.updateDisplayType({
          displayType: serverWidget.FieldDisplayType.NORMAL,
        });
      } else {
        toCustomerField.updateDisplayType({
          displayType: serverWidget.FieldDisplayType.HIDDEN,
        });
        toSiteField.updateDisplayType({
          displayType: serverWidget.FieldDisplayType.HIDDEN,
        });
        fromCustomerField.updateDisplayType({
          displayType: serverWidget.FieldDisplayType.HIDDEN,
        });
        fromSiteField.updateDisplayType({
          displayType: serverWidget.FieldDisplayType.HIDDEN,
        });
      }

      // Sublist for Assets to Allocate
      var sublist = form.addSublist({
        id: "custpage_assets_sublist",
        type: serverWidget.SublistType.INLINEEDITOR,
        label: "Assets to Allocate",
      });

      // Asset field (dropdown from custom record)
      var assetField = sublist.addField({
        id: "custpage_asset",
        type: serverWidget.FieldType.SELECT,
        label: "Asset",
      });

      populateAssetOptions(
        typeParam,
        fromCustomerParam,
        fromSiteParam,
        assetField
      );

      // Asset field EA1
      sublist.addField({
        id: "custpage_asset_name",
        type: serverWidget.FieldType.TEXT,
        label: "Asset Serial Number",
        defaultValue: "custrecord_assetserialno",
      });

      // Qty field (integer)
      sublist.addField({
        id: "custpage_qty",
        type: serverWidget.FieldType.INTEGER,
        label: "Qty",
        defaultValue: "1",
      });

      // Amount field (decimal)
      sublist.addField({
        id: "custpage_amount",
        type: serverWidget.FieldType.CURRENCY,
        label: "Current Net Book Value",
        defaultValue: "1000",
      });

      // Add a new "memo" field
      sublist.addField({
        id: "custpage_memo",
        type: serverWidget.FieldType.TEXT,
        label: "Memo",
      });

      form.addSubmitButton({
        label: "Submit",
      });

      context.response.writePage(form);
    } else {
      // Handle POST request

      var processingForm = serverWidget.createForm({
        title: "Processing Asset Allocation",
      });

      var messageField = processingForm.addField({
        id: "custpage_message",
        type: serverWidget.FieldType.INLINEHTML,
        label: "Processing",
      });
      messageField.defaultValue =
        "<h2>Asset allocation is being processed. Please wait...</h2>";

      context.response.writePage(processingForm);
      var type = context.request.parameters.custpage_type_field;

      if (type === "warehouse") {
        var subsidiaryId = 12;
        var currencyId = 1;
        var accountDebit = 1109;
        var totalCreditAmount = 0;

        // Create custom transaction
        var transaction = record.create({
          type: "customtransaction106",
          isDynamic: true,
        });

        transaction.setValue({
          fieldId: "subsidiary",
          value: subsidiaryId,
        });
        transaction.setValue({
          fieldId: "currency",
          value: currencyId,
        });

        // Get the date from the form
        var trandate = context.request.parameters.custpage_date_field;

        var allocationdate = format.parse({
          value: trandate,
          type: format.Type.DATE,
        });

        if (allocationdate) {
          transaction.setValue({
            fieldId: "trandate",
            value: allocationdate,
          });
        }

        var assetCount = context.request.getLineCount({
          group: "custpage_assets_sublist",
        });
        var assetIds = [];

        for (var i = 0; i < assetCount; i++) {
          var assetId = context.request.getSublistValue({
            group: "custpage_assets_sublist",
            name: "custpage_asset",
            line: i,
          });
          assetIds.push(assetId);

          var assetRecord = record.load({
            type: "customrecord_ncfar_asset",
            id: assetId,
          });

          var memoValue = context.request.getSublistValue({
            group: "custpage_assets_sublist",
            name: "custpage_memo",
            line: i,
          });

          var accountCredit = assetRecord.getValue({
            fieldId: "custrecord_assetmainacc",
          });
          var creditAmount = assetRecord.getValue({
            fieldId: "custrecord_assetbookvalue",
          });

          totalCreditAmount += creditAmount;

          // Add credit line
          transaction.selectNewLine({
            sublistId: "line",
          });

          transaction.setCurrentSublistValue({
            sublistId: "line",
            fieldId: "memo",
            value: memoValue,
          });
          transaction.setCurrentSublistValue({
            sublistId: "line",
            fieldId: "account",
            value: accountCredit,
          });
          transaction.setCurrentSublistValue({
            sublistId: "line",
            fieldId: "credit",
            value: creditAmount,
          });
          transaction.commitLine({
            sublistId: "line",
          });
        }

        // Add debit line
        transaction.selectNewLine({
          sublistId: "line",
        });
        transaction.setCurrentSublistValue({
          sublistId: "line",
          fieldId: "account",
          value: accountDebit,
        });
        transaction.setCurrentSublistValue({
          sublistId: "line",
          fieldId: "debit",
          value: totalCreditAmount,
        });
        transaction.setValue({
          fieldId: "custbody_total_amount_allocinst",
          value: totalCreditAmount,
        });

        transaction.commitLine({
          sublistId: "line",
        });

        var transactionId = transaction.save();

        // Update each asset with the created transaction ID and other fields
        for (var j = 0; j < assetIds.length; j++) {
          var assetRecordToUpdate = record.load({
            type: "customrecord_ncfar_asset",
            id: assetIds[j],
          });

          var toCustomerId = context.request.parameters.custpage_to_customer;
          var toSiteId = context.request.parameters.custpage_to_site;
          var asset = record.load({
            type: "customrecord_ncfar_asset",
            id: assetIds[j],
          });
          // Load the customer record
          var customer = record.load({
            type: "customer",
            id: toCustomerId,
          });

          // Get the field value
          var assettype = customer.getValue({
            fieldId: "custentity_asset_type_customer",
          });

          if (assettype) {
            // Hacer algo con el valor del campo 'custentity_asset_type_custome' obtenido
            // Por ejemplo, puedes imprimirlo en la consola para verificar
            log.debug("Valor del campo asset type:", assettype);
          } else {
            log.error(
              "No se encontrÃ³ informaciÃ³n para el cliente con ID:",
              toCustomerId
            );
          }

          assetRecordToUpdate.setValue({
            fieldId: "custrecord_asset_allocation_journal",
            value: transactionId,
          });
          assetRecordToUpdate.setValue({
            fieldId: "custrecord_asset_allctstatus",
            value: 2,
          });
          assetRecordToUpdate.setValue({
            fieldId: "custrecord_asset_customer",
            value: toCustomerId,
          });
          assetRecordToUpdate.setValue({
            fieldId: "custrecord_asset_iotsite",
            value: toSiteId,
          });
          assetRecordToUpdate.setValue({
            fieldId: "custrecord_assetstatus",
            value: 2,
          });
          assetRecordToUpdate.setValue({
            fieldId: "custrecord_assetmainacc",
            value: 1109,
          });
          assetRecordToUpdate.setValue({
            fieldId: "custrecord_assetdepractive",
            value: 1,
          });
          assetRecordToUpdate.setValue({
            fieldId: "custrecord_assetdeprstartdate",
            value: allocationdate,
          });
          assetRecordToUpdate.setValue({
            fieldId: "custrecord_assettype",
            value: assettype,
          });

          assetRecordToUpdate.save();

          // Crear Fam Usage para Assets Nuevos, Create the new custom record
          var temporal = search.create({
            type: "customrecord_ncfar_assetusage",
            filters: [
              ["custrecord_usageassetid", "is", assetIds[j]],
              "AND",
              [
                "custrecord_usageperiod",
                "is",
                getMonthInLetters(allocationdate) + " " + allocationdate.getFullYear(),
              ],
            ],
            columns: ["custrecord_usageassetid"],
          });
          log.debug("temporal MV", temporal);
          var searchResultCount = temporal.runPaged().count;
          log.debug("searchResultCount MV", searchResultCount);

          if (searchResultCount == 0) {
            var assetUsageRecord = record.create({
              type: "customrecord_ncfar_assetusage",
              isDynamic: true,
            });

            log.debug("allocationdate EA", allocationdate);
            log.debug("asset number", assetIds[j]);

            // Get the last day of the month
            var lastDayOfMonth = new Date(
              allocationdate.getFullYear(),
              allocationdate.getMonth() + 1,
              0
            );
            log.debug("lastDayOfMonth", lastDayOfMonth);

            // Set the values
            assetUsageRecord.setValue({
              fieldId: "custrecord_usageassetid",
              value: assetIds[j],
            });

            // Get the three-letter abbreviation of the month
            var monthAbbreviation = getMonthInLetters(allocationdate);
            log.debug("monthAbbreviation", monthAbbreviation);

            // Set the usageUnitPeriod to the three-letter month abbreviation and the year
            var usagePeriod =
              monthAbbreviation + " " + allocationdate.getFullYear();
            log.debug("usagePeriod", usagePeriod);

            assetUsageRecord.setValue({
              fieldId: "custrecord_usagedate",
              value: lastDayOfMonth,
            });
            assetUsageRecord.setValue({
              fieldId: "custrecord_usageperiod",
              value: usagePeriod,
            });
            assetUsageRecord.setValue({
              fieldId: "custrecord_usageunits",
              value: 1,
            });

            assetUsageRecord.save();
          }
        }
      } else if (type === "customer") {
        var subsidiaryId = 12;
        var currencyId = 1;
        var accountDebit = 1112;
        var accountDebitDepreciation = 312;
        var accountCreditDepreciation = 1109;
        var totalCreditAmount = 0;
        var totalAccDepreciation = 0;

        // Create custom transaction
        var transaction = record.create({
          type: "customtransaction106",
          isDynamic: true,
        });

        transaction.setValue({
          fieldId: "subsidiary",
          value: subsidiaryId,
        });
        transaction.setValue({
          fieldId: "currency",
          value: currencyId,
        });

        // Get the date from the form
        var trandate = context.request.parameters.custpage_date_field;

        var allocationdate = format.parse({
          value: trandate,
          type: format.Type.DATE,
        });

        if (allocationdate) {
          transaction.setValue({
            fieldId: "trandate",
            value: allocationdate,
          });
        }

        var assetCount = context.request.getLineCount({
          group: "custpage_assets_sublist",
        });
        var assetIds = [];

        for (var i = 0; i < assetCount; i++) {
          var assetId = context.request.getSublistValue({
            group: "custpage_assets_sublist",
            name: "custpage_asset",
            line: i,
          });
          assetIds.push(assetId);

          var assetRecord = record.load({
            type: "customrecord_ncfar_asset",
            id: assetId,
          });

          var accountCredit = assetRecord.getValue({
            fieldId: "custrecord_assetmainacc",
          });

          var accDepreciation = assetRecord.getValue({
            fieldId: "custrecord_assetdeprtodate",
          });
          totalAccDepreciation += accDepreciation;

          var creditAmount = assetRecord.getValue({
            fieldId: "custrecord_assetbookvalue",
          });

          totalCreditAmount += creditAmount;

          var memoValue = context.request.getSublistValue({
            group: "custpage_assets_sublist",
            name: "custpage_memo",
            line: i,
          });

          // Add credit line
          transaction.selectNewLine({
            sublistId: "line",
          });
          transaction.setCurrentSublistValue({
            sublistId: "line",
            fieldId: "account",
            value: accountCredit,
          });
          transaction.setCurrentSublistValue({
            sublistId: "line",
            fieldId: "memo",
            value: memoValue,
          });
          transaction.setCurrentSublistValue({
            sublistId: "line",
            fieldId: "credit",
            value: creditAmount,
          });
          transaction.commitLine({
            sublistId: "line",
          });
        }

        // Add debit line
        transaction.selectNewLine({
          sublistId: "line",
        });
        transaction.setCurrentSublistValue({
          sublistId: "line",
          fieldId: "account",
          value: accountDebit,
        });
        transaction.setCurrentSublistValue({
          sublistId: "line",
          fieldId: "debit",
          value: totalCreditAmount,
        });
        transaction.commitLine({
          sublistId: "line",
        });

        // Add debit line
        transaction.selectNewLine({
          sublistId: "line",
        });
        transaction.setCurrentSublistValue({
          sublistId: "line",
          fieldId: "account",
          value: accountCreditDepreciation,
        });
        transaction.setCurrentSublistValue({
          sublistId: "line",
          fieldId: "credit",
          value: totalAccDepreciation,
        });
        transaction.commitLine({
          sublistId: "line",
        });
        transaction.selectNewLine({
          sublistId: "line",
        });
        transaction.setCurrentSublistValue({
          sublistId: "line",
          fieldId: "account",
          value: accountDebitDepreciation,
        });
        transaction.setCurrentSublistValue({
          sublistId: "line",
          fieldId: "debit",
          value: totalAccDepreciation,
        });
        transaction.commitLine({
          sublistId: "line",
        });

        transaction.setValue({
          fieldId: "custbody_total_amount_allocinst",
          value: totalCreditAmount + totalAccDepreciation,
        });

        var transactionId = transaction.save();

        // Update each asset with the created transaction ID and other fields
        for (var j = 0; j < assetIds.length; j++) {
          var assetRecordToUpdate = record.load({
            type: "customrecord_ncfar_asset",
            id: assetIds[j],
          });

          var toCustomerId = context.request.parameters.custpage_to_customer;
          var toSiteId = context.request.parameters.custpage_to_site;

          assetRecordToUpdate.setValue({
            fieldId: "custrecord_asset_allocation_journal",
            value: transactionId,
          });
          assetRecordToUpdate.setValue({
            fieldId: "custrecord_asset_allctstatus",
            value: 1,
          });
          assetRecordToUpdate.setValue({
            fieldId: "custrecord_asset_customer",
            value: toCustomerId,
          });
          assetRecordToUpdate.setValue({
            fieldId: "custrecord_asset_iotsite",
            value: toSiteId,
          });
          assetRecordToUpdate.setValue({
            fieldId: "custrecord_assetstatus",
            value: 2,
          });
          assetRecordToUpdate.setValue({
            fieldId: "custrecord_assetmainacc",
            value: 1112,
          });
          assetRecordToUpdate.setValue({
            fieldId: "custrecord_assetdepractive",
            value: 2,
          });
          assetRecordToUpdate.setValue({
            fieldId: "custrecord_assetdeprstartdate",
            value: "",
          });
          assetRecordToUpdate.setValue({
            fieldId: "custrecord_assettype",
            value: 1,
          });

          assetRecordToUpdate.save();
        }
      } else if (type === "between") {
        var subsidiaryId = 12;
        var currencyId = 1;
        var accountDebit = 1109;
        var totalCreditAmount = 0;

        // Create custom transaction
        var transaction = record.create({
          type: "customtransaction106",
          isDynamic: true,
        });

        transaction.setValue({
          fieldId: "subsidiary",
          value: subsidiaryId,
        });
        transaction.setValue({
          fieldId: "currency",
          value: currencyId,
        });

        // Get the date from the form
        var trandate = context.request.parameters.custpage_date_field;
        var allocationdate = format.parse({
          value: trandate,
          type: format.Type.DATE,
        });

        if (allocationdate) {
          transaction.setValue({
            fieldId: "trandate",
            value: allocationdate,
          });
        }

        var assetCount = context.request.getLineCount({
          group: "custpage_assets_sublist",
        });
        var assetIds = [];

        for (var i = 0; i < assetCount; i++) {
          var assetId = context.request.getSublistValue({
            group: "custpage_assets_sublist",
            name: "custpage_asset",
            line: i,
          });
          assetIds.push(assetId);

          var memoValue = context.request.getSublistValue({
            group: "custpage_assets_sublist",
            name: "custpage_memo",
            line: i,
          });

          var assetRecord = record.load({
            type: "customrecord_ncfar_asset",
            id: assetId,
          });

          var accountCredit = assetRecord.getValue({
            fieldId: "custrecord_assetmainacc",
          });
          var creditAmount = assetRecord.getValue({
            fieldId: "custrecord_assetbookvalue",
          });

          totalCreditAmount += creditAmount;

          // Add credit line
          transaction.selectNewLine({
            sublistId: "line",
          });
          transaction.setCurrentSublistValue({
            sublistId: "line",
            fieldId: "account",
            value: accountCredit,
          });
          transaction.setCurrentSublistValue({
            sublistId: "line",
            fieldId: "memo",
            value: memoValue,
          });
          transaction.setCurrentSublistValue({
            sublistId: "line",
            fieldId: "debit",
            value: creditAmount,
          });
          transaction.commitLine({
            sublistId: "line",
          });
        }

        // Add debit line
        transaction.selectNewLine({
          sublistId: "line",
        });
        transaction.setCurrentSublistValue({
          sublistId: "line",
          fieldId: "account",
          value: accountDebit,
        });
        transaction.setCurrentSublistValue({
          sublistId: "line",
          fieldId: "credit",
          value: totalCreditAmount,
        });
        transaction.commitLine({
          sublistId: "line",
        });

        transaction.setValue({
          fieldId: "custbody_total_amount_allocinst",
          value: totalCreditAmount,
        });

        var transactionId = transaction.save();

        // Update each asset with the created transaction ID and other fields
        for (var j = 0; j < assetIds.length; j++) {
          var assetRecordToUpdate = record.load({
            type: "customrecord_ncfar_asset",
            id: assetIds[j],
          });

          var toCustomerId = context.request.parameters.custpage_to_customer;
          var toSiteId = context.request.parameters.custpage_to_site;

          // Load the customer record
          var customer = record.load({
            type: "customer",
            id: toCustomerId,
          });

          // Get the field value
          var assettype = customer.getValue({
            fieldId: "custentity_asset_type_customer",
          });

          assetRecordToUpdate.setValue({
            fieldId: "custrecord_asset_allocation_journal",
            value: transactionId,
          });
          assetRecordToUpdate.setValue({
            fieldId: "custrecord_asset_allctstatus",
            value: 2,
          });
          assetRecordToUpdate.setValue({
            fieldId: "custrecord_asset_customer",
            value: toCustomerId,
          });
          assetRecordToUpdate.setValue({
            fieldId: "custrecord_asset_iotsite",
            value: toSiteId,
          });
          assetRecordToUpdate.setValue({
            fieldId: "custrecord_assetstatus",
            value: 2,
          });
          assetRecordToUpdate.setValue({
            fieldId: "custrecord_assetmainacc",
            value: 1109,
          });
          assetRecordToUpdate.setValue({
            fieldId: "custrecord_assetdepractive",
            value: 1,
          });
          assetRecordToUpdate.setValue({
            fieldId: "custrecord_assettype",
            value: assettype,
          });

          assetRecordToUpdate.save();
        }
      }
      // Redirect to the newly created transaction
      redirect.toRecord({
        type: "customtransaction106",
        id: transactionId,
      });
    }
  }

  function populateSiteOptions(customerId, siteField, selectedSite) {
    if (customerId) {
      var siteSearch = search.create({
        type: "customrecord798",
        filters: [["custrecord1", "anyof", customerId]],
        columns: ["internalid", "name"],
      });

      siteField.addSelectOption({
        value: "",
        text: "",
      }); // Add blank option

      siteSearch.run().each(function (result) {
        siteField.addSelectOption({
          value: result.getValue("internalid"),
          text: result.getValue("name"),
        });
        return true;
      });

      if (selectedSite) {
        siteField.defaultValue = selectedSite;
      }
    }
  }

  function populateAssetOptions(type, customerId, siteId, assetField) {
    var filters = [];

    if (type === "warehouse") {
      filters.push(["custrecord_asset_customer", "anyof", "@NONE@"]);
      filters.push("AND");
      filters.push(["custrecord_asset_iotsite", "anyof", "@NONE@"]);
    } else if (
      (type === "customer" || type === "between") &&
      customerId &&
      siteId
    ) {
      filters.push(["custrecord_asset_customer", "anyof", customerId]);
      filters.push("AND");
      filters.push(["custrecord_asset_iotsite", "anyof", siteId]);
    } else {
      // Skip populating assets if the required fields are not set
      assetField.addSelectOption({
        value: "",
        text: "",
      }); // Add blank option
      return;
    }

    var assetSearch = search.create({
      type: "customrecord_ncfar_asset",
      filters: filters,
      columns: ["internalid", "name", "altname", "custrecord_assetserialno"],
    });

    assetField.addSelectOption({
      value: "",
      text: "",
    }); // Add blank option

    assetSearch.run().each(function (result) {
      var assetText =
        result.getValue("name") + " " + result.getValue("altname");
      assetField.addSelectOption({
        value: result.getValue("internalid"),
        text: assetText,
      });
      return true;
    });
  }

  function parseDate(dateString) {
    var formats = ["M/D/YYYY", "D/M/YYYY"];
    for (var i = 0; i < formats.length; i++) {
      try {
        var date = format.parse({
          value: dateString,
          type: format.Type.DATE,
        });
        if (!isNaN(date)) {
          return formatDateForNetSuite(date);
        }
      } catch (e) {
        log.debug(
          "Date Parsing",
          "Failed to parse date: " + dateString + " with format: " + formats[i]
        );
      }
    }
    return null;
  }

  function getMonthInLetters(date) {
    var monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    var monthIndex = date.getMonth(); // getMonth() returns month index starting from 0 (January) to 11 (December)
    return monthNames[monthIndex];
  }

  function formatDateForNetSuite(date) {
    var month = date.getMonth() + 1;
    var day = date.getDate();
    var year = date.getFullYear();
    return month + "/" + day + "/" + year; // Convert to M/D/YYYY
  }

  return {
    onRequest: onRequest,
  };
});
