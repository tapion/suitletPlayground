/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define([
  "N/ui/serverWidget",
  "N/search",
  "N/log",
  "N/format",
  "N/record",
  "N/url",
  "N/redirect",
  "N/runtime",
], function (
  serverWidget,
  search,
  log,
  format,
  record,
  url,
  redirect,
  runtime
) {
  function parseDate(dateString) {
    var formats = ["M/D/YYYY", "D/M/YYYY"];
    var userDateFormat = runtime
      .getCurrentUser()
      .getPreference({ name: "dateformat" });
    log.debug("userDateFormat:", userDateFormat);
    for (var i = 0; i < formats.length; i++) {
      try {
        var date = format.parse({
          value: dateString,
          type: format.Type.DATE,
        });
        log.debug("date:", date);
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
  function formatDateForURL(month, day, year) {
    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;
    var userDateFormat = runtime
      .getCurrentUser()
      .getPreference({ name: "dateformat" });
    if (userDateFormat === "DD/MM/YYYY") {
      return [day, month, year].join("/");
    } else if (userDateFormat === "MM/DD/YYYY") {
      return [month, day, year].join("/");
    }
  }

  function onRequest(context) {
    var parameters = context.request.parameters;
    var filterType = parameters.filterType || "";
    var filterInitDateDay = parameters.filterInitDateDay || "";
    var filterInitDateMonth = parameters.filterInitDateMonth || "";
    var filterInitDateYear = parameters.filterInitDateYear || "";
    var filterEndDateDay = parameters.filterEndDateDay || "";
    var filterEndDateMonth = parameters.filterEndDateMonth || "";
    var filterEndDateYear = parameters.filterEndDateYear || "";
    var initDateRow = parameters.initDateRow || "";
    var finalDateRow = parameters.finalDateRow || "";

    // var filterInitDate = filterInitDateDay ? parseDate(initDateRow) : "";
    // var filterEndDate = filterEndDateDay ? parseDate(finalDateRow) : "";
    var filterInitDate = filterInitDateDay
      ? formatDateForURL(
          filterInitDateMonth,
          filterInitDateDay,
          filterInitDateYear
        )
      : "";
    var filterEndDate = filterEndDateDay
      ? formatDateForURL(
          filterEndDateMonth,
          filterEndDateDay,
          filterEndDateYear
        )
      : "";
    // var filterInitDate = filterInitDateDay
    //   ? formatDateForNetSuite(
    //       filterInitDateMonth,
    //       filterInitDateDay,
    //       filterInitDateYear
    //     )
    //   : "";
    // var filterEndDate = filterEndDateDay
    //   ? formatDateForNetSuite(
    //       filterEndDateMonth,
    //       filterEndDateDay,
    //       filterEndDateYear
    //     )
    //   : "";
    log.debug("filterInitDate:", filterInitDate);
    log.debug("filterEndDate:", filterEndDate);
    log.debug("Lo que llega:", parameters);
    if (context.request.method === "GET") {
      var form = serverWidget.createForm({
        title: "Assets Installation",
      });
      form.clientScriptModulePath =
        "/SuiteScripts/InstallationSuitelet_Client.js";

      var assetTab = form.addTab({
        id: "custpage_asset_tab",
        label: "Asset Installation",
      });

      var sublist = form.addSublist({
        id: "custpage_assets_sublist",
        type: serverWidget.SublistType.INLINEEDITOR,
        label: "Assets to Allocate",
        tab: "custpage_asset_tab",
      });

      var assetField = sublist.addField({
        id: "custpage_asset",
        type: serverWidget.FieldType.SELECT,
        label: "Asset",
      });

      var assets = getFilteredAssets();
      assetField.addSelectOption({ value: "", text: "" }); // Add blank option
      assets.forEach(function (asset) {
        assetField.addSelectOption({
          value: asset.value,
          text: asset.text,
        });
      });

      var costField = sublist.addField({
        id: "custpage_asset_cost",
        type: serverWidget.FieldType.CURRENCY,
        label: "Current Net Book Value",
      });
      costField.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.DISABLED,
      });

      form.addSubtab({
        id: "custpage_transaction_cost_subtab",
        label: "Transaction Cost",
      });

      form.addTab({
        id: "custpage_transactions_subtab",
        label: "Transaction Costs",
      });

      form.addField({
        id: "custpage_start_date",
        type: serverWidget.FieldType.DATE,
        label: "Transaction Date",
      });

      var transactionSublist = form.addSublist({
        id: "custpage_transaction_sublist",
        type: serverWidget.SublistType.INLINEEDITOR,
        label: "Select Transactions",
        tab: "custpage_transactions_subtab",
      });

      var transactionField = transactionSublist.addField({
        id: "custpage_transaction_select",
        type: serverWidget.FieldType.SELECT,
        label: "Transaction",
      });

      transactionField.addSelectOption({ value: "", text: "" }); // Add blank option
      var transactions = getTransactions(
        filterInitDate,
        filterEndDate,
        filterType
      );
      transactions.forEach(function (transaction) {
        var optionText =
          transaction.text + " - LineID: " + transaction.lineuniquekey;
        transactionField.addSelectOption({
          value: transaction.value + "-" + transaction.lineuniquekey,
          text: optionText,
        });
      });

      var costTranField = transactionSublist.addField({
        id: "custpage_asset_tran_cost",
        type: serverWidget.FieldType.CURRENCY,
        label: "Amount",
      });
      costTranField.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.DISABLED,
      });
      form.addSubmitButton({
        label: "Submit",
      });

      var filterInitDateField = form.addField({
        id: "custpage_filter_date_initial",
        type: serverWidget.FieldType.DATE,
        label: "Filter Initial Date",
      });
      var filterEndDateField = form.addField({
        id: "custpage_filter_date_final",
        type: serverWidget.FieldType.DATE,
        label: "Filter Final Date",
      });
      filterInitDateField.defaultValue = filterInitDate ? filterInitDate : "";
      filterEndDateField.defaultValue = filterEndDate ? filterEndDate : "";

      var filterTypeField = form.addField({
        id: "custpage_filter_type",
        type: serverWidget.FieldType.SELECT,
        label: "Filter Type",
      });

      var totalField = form.addField({
        id: "custpage_total_amount",
        type: serverWidget.FieldType.CURRENCY,
        label: "Total Amount",
      });

      totalField.defaultValue = "0.00";
      totalField.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.INLINE,
      });

      var totalTranCost = form.addField({
        id: "custpage_total_tran_cost",
        type: serverWidget.FieldType.CURRENCY,
        label: "Total Transaction Cost",
      });

      totalTranCost.defaultValue = "0.00";
      totalTranCost.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.INLINE,
      });

      filterTypeField.addSelectOption({ value: "", text: "" });
      filterTypeField.addSelectOption({
        value: "VendBill",
        text: "Vendor Bill",
      });
      filterTypeField.addSelectOption({
        value: "Journal",
        text: "Journal Entry",
      });
      filterTypeField.defaultValue = filterType;

      form.addButton({
        id: "custpage_apply_filters",
        label: "Apply Filters",
        functionName: "applyFilters",
      });

      context.response.writePage(form);
    } else {
      try {
        var subsidiaryId = 12;
        var currencyId = 1;
        var transactionDate = context.request.parameters.custpage_start_date;

        log.debug("POST Parameters", {
          subsidiaryId: subsidiaryId,
          currencyId: currencyId,
          transactionDate: transactionDate,
        });

        var transactionRecord = record.create({
          type: "customtransaction107",
          isDynamic: true,
        });

        transactionRecord.setValue("subsidiary", subsidiaryId);
        transactionRecord.setValue("currency", currencyId);
        transactionRecord.setValue("trandate", new Date(transactionDate));

        var totalCreditAmount = 0;
        var assetLines = [];
        var assetCount = context.request.getLineCount({
          group: "custpage_assets_sublist",
        });
        var transactionCount = context.request.getLineCount({
          group: "custpage_transaction_sublist",
        });

        log.debug("Counts", {
          assetCount: assetCount,
          transactionCount: transactionCount,
        });

        var selectedAssets = {};
        var selectedTransactions = {};

        for (var i = 0; i < transactionCount; i++) {
          var transactionValue = context.request.getSublistValue({
            group: "custpage_transaction_sublist",
            name: "custpage_transaction_select",
            line: i,
          });

          log.debug("Transaction Value", transactionValue); // Log transaction value

          if (!transactionValue) continue; // Skip empty lines

          var [transactionId, lineUniqueKey] = transactionValue.split("-");
          var transactionUniqueId = transactionId + "-" + lineUniqueKey;

          if (selectedTransactions[transactionUniqueId]) {
            throw new Error(
              "Duplicate transaction line selected: " + transactionUniqueId
            );
          }
          selectedTransactions[transactionUniqueId] = true;

          var transactionType = search.lookupFields({
            type: "transaction",
            id: transactionId,
            columns: ["type"],
          }).type[0].value;

          // Map the returned type to the correct record type
          if (transactionType === "Journal") {
            transactionType = "journalentry";
          } else if (transactionType === "VendBill") {
            transactionType = "vendorbill";
          }

          log.debug("Transaction Details", {
            transactionId: transactionId,
            lineUniqueKey: lineUniqueKey,
            transactionType: transactionType,
          });

          var transactionSearch = search.create({
            type: "transaction",
            filters: [
              ["lineuniquekey", search.Operator.EQUALTO, lineUniqueKey],
            ],
            columns: ["account", "debitamount", "line"],
          });

          var transactionResults = transactionSearch
            .run()
            .getRange({ start: 0, end: 1 });
          if (transactionResults.length > 0) {
            var accountId = transactionResults[0].getValue("account");
            var debitAmount = transactionResults[0].getValue("debitamount");
            var lineIndex = transactionResults[0].getValue("line");

            log.debug("Transaction Line Details", {
              accountId: accountId,
              debitAmount: debitAmount,
              lineIndex: lineIndex,
            });

            transactionRecord.selectNewLine({ sublistId: "line" });
            transactionRecord.setCurrentSublistValue({
              sublistId: "line",
              fieldId: "account",
              value: accountId,
            });
            transactionRecord.setCurrentSublistValue({
              sublistId: "line",
              fieldId: "credit",
              value: debitAmount,
            });
            transactionRecord.commitLine({ sublistId: "line" });

            totalCreditAmount += parseFloat(debitAmount);
          } else {
          }
        }

        for (var j = 0; j < assetCount; j++) {
          var assetId = context.request.getSublistValue({
            group: "custpage_assets_sublist",
            name: "custpage_asset",
            line: j,
          });

          if (!assetId) continue; // Skip empty lines

          if (selectedAssets[assetId]) {
            throw new Error("Duplicate asset selected: " + assetId);
          }
          selectedAssets[assetId] = true;

          var asset = record.load({
            type: "customrecord_ncfar_asset",
            id: assetId,
          });

          var mainAccountId = asset.getValue("custrecord_assetmainacc");
          assetLines.push({
            assetId: assetId,
            mainAccountId: mainAccountId,
          });

          log.debug("Asset Details", {
            assetId: assetId,
            mainAccountId: mainAccountId,
          });
        }

        if (Object.keys(selectedAssets).length === 0) {
          throw new Error("At least one asset must be selected.");
        }

        if (Object.keys(selectedTransactions).length === 0) {
          throw new Error("At least one transaction line must be selected.");
        }

        // Calculate debit amount per asset and round to 2 decimal places
        var debitAmountPerAsset = parseFloat(
          (totalCreditAmount / assetLines.length).toFixed(2)
        );
        log.debug("Debit Amount Per Asset", debitAmountPerAsset);

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
          transactionRecord.selectNewLine({ sublistId: "line" });
          transactionRecord.setCurrentSublistValue({
            sublistId: "line",
            fieldId: "account",
            value: assetLine.mainAccountId,
          });
          transactionRecord.setCurrentSublistValue({
            sublistId: "line",
            fieldId: "debit",
            value: debitAmount,
          });
          transactionRecord.commitLine({ sublistId: "line" });
          totalDebitAmount += debitAmount;
        });

        transactionRecord.setValue({
          fieldId: "custbody_total_amount_allocinst",
          value: totalDebitAmount,
        });

        var transactionId = transactionRecord.save();
        log.debug("Transaction Created", "Transaction ID: " + transactionId);

        assetLines.forEach(function (assetLine) {
          var asset = record.load({
            type: "customrecord_ncfar_asset",
            id: assetLine.assetId,
          });

          var currentCost = asset.getValue("custrecord_assetcurrentcost");
          var currentNBV = asset.getValue("custrecord_assetbookvalue");

          var newCost = currentCost + debitAmountPerAsset;
          var newNBV = currentNBV + debitAmountPerAsset;
          log.debug("Updating Asset", {
            assetId: assetLine.assetId,
            currentCost: currentCost,
            newCost: newCost,
            currentNBV: currentNBV,
            newNBV: newNBV,
          });
          asset.setValue("custrecord_assetcurrentcost", newCost);
          asset.setValue("custrecord_assetbookvalue", newNBV);
          asset.setValue("custrecord_asset_allctinstalation", transactionId);
          asset.save();
        });

        redirect.toRecord({
          type: "customtransaction107",
          id: transactionId,
        });
      } catch (e) {
        log.error("Error Processing Asset Installation", e.message);
        var errorForm = serverWidget.createForm({
          title: "Error Processing Asset Installation",
        });
        errorForm.addField({
          id: "custpage_message",
          type: serverWidget.FieldType.INLINEHTML,
          label: "Error",
        }).defaultValue =
          "<h2>An error occurred while processing the asset installation: " +
          e.message +
          "</h2>";

        context.response.writePage(errorForm);
      }
    }
  }

  function formatDate(dateString) {
    var date = new Date(dateString);
    return format.format({
      value: date,
      type: format.Type.DATE,
    });
  }

  function getFilteredAssets() {
    var options = [];
    var assetSearch = search.create({
      type: "customrecord_ncfar_asset",
      filters: [["custrecord_asset_allctstatus", search.Operator.ANYOF, "2"]],
      columns: [
        search.createColumn({ name: "internalid" }),
        search.createColumn({ name: "name" }),
        search.createColumn({ name: "altname" }),
        search.createColumn({ name: "custrecord_assetcurrentcost" }),
      ],
    });

    assetSearch.run().each(function (result) {
      var name = result.getValue({ name: "name" });
      var altName = result.getValue({ name: "altname" });
      var cost = result.getValue({ name: "custrecord_assetcurrentcost" });
      var displayName = name + (altName ? " (" + altName + ")" : "");
      options.push({
        value: result.getValue({ name: "internalid" }),
        text: displayName,
      });
      return true;
    });

    return options;
  }

  function getTransactions(initDate, endDate, filterType) {
    var filters = [
      ["subsidiary", search.Operator.ANYOF, "12"],
      "AND",
      ["type", search.Operator.ANYOF, ["VendBill", "Journal"]],
      "AND",
      ["account", search.Operator.ANYOF, "1111"],
      "AND",
      ["posting", search.Operator.IS, true],
      "AND",
      ["debitamount", search.Operator.ISNOTEMPTY, ""],
      "AND",
      ["custcol_asset_ins_journal", search.Operator.ISEMPTY, ""],
    ];
    if (initDate) {
      filters.push("AND", ["trandate", search.Operator.ONORAFTER, initDate]);
    }
    if (endDate) {
      filters.push("AND", ["trandate", search.Operator.ONORBEFORE, endDate]);
    }

    if (filterType) {
      filters.push("AND", ["type", search.Operator.ANYOF, [filterType]]);
    }

    log.debug("Transaction Filters", filters);
    var options = [];
    var transactionSearch = search.create({
      type: search.Type.TRANSACTION,
      filters: filters,
      columns: [
        search.createColumn({ name: "tranid" }),
        search.createColumn({ name: "type" }),
        search.createColumn({ name: "account" }),
        search.createColumn({ name: "debitamount" }),
        search.createColumn({ name: "lineuniquekey" }),
      ],
    });

    transactionSearch.run().each(function (result) {
      options.push({
        value: result.id,
        text:
          result.getText({ name: "type" }) +
          " " +
          result.getValue({ name: "tranid" }) +
          " - " +
          result.getText({ name: "account" }) +
          " $ " +
          result.getValue({ name: "debitamount" }),
        lineuniquekey: result.getValue({ name: "lineuniquekey" }),
      });
      return true;
    });

    return options;
  }

  function formatDateForNetSuite(month, day, year) {
    return month + "/" + day + "/" + year;
  }

  return {
    onRequest: onRequest,
  };
});
