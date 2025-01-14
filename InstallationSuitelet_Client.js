/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(["N/currentRecord", "N/search", 'N/url'], function (currentRecord, search, url) {
  function fieldChanged(context) {
    var rec = context.currentRecord;
    var sublistName = context.sublistId;
    var fieldId = context.fieldId;
    var accItems = 0;
    // Handle asset cost update
    if (
      sublistName === "custpage_assets_sublist" &&
      fieldId === "custpage_asset"
    ) {
      var lineCount = rec.getLineCount({
        sublistId: "custpage_assets_sublist",
      });
      var amountTmp = 0;
      for (var i = 0; i < lineCount; i++) {
        var amount = parseFloat(
          rec.getSublistValue({
            sublistId: "custpage_assets_sublist",
            fieldId: "custpage_asset_cost",
            line: i,
          }) || 0
        );
        accItems += amount;
      }
      var assetId = rec.getCurrentSublistValue({
        sublistId: sublistName,
        fieldId: "custpage_asset",
      });

      var assetCost = getAssetCost(assetId);
      amountTmp = parseFloat(assetCost);
      rec.setCurrentSublistValue({
        sublistId: sublistName,
        fieldId: "custpage_asset_cost",
        value: assetCost,
      });
      rec.setValue({
        fieldId: "custpage_total_amount",
        value: accItems + amountTmp,
      });
    }

    if (
      sublistName === "custpage_transaction_sublist" &&
      fieldId === "custpage_transaction_select"
    ) {
      accItems = 0;
      var lineCount = rec.getLineCount({
        sublistId: "custpage_transaction_sublist",
      });
      var amountField = "custpage_asset_tran_cost";
      for (var i = 0; i < lineCount; i++) {
        var amount = parseFloat(
          rec.getSublistValue({
            sublistId: sublistName,
            fieldId: amountField,
            line: i,
          }) || 0
        );
        accItems += amount;
      }
      var tranId = rec.getCurrentSublistValue({
        sublistId: sublistName,
        fieldId: "custpage_transaction_select",
      });
      var [transactionId, lineUniqueKey] = tranId.split("-");
      var tranCost = getTransCost(lineUniqueKey);

      rec.setCurrentSublistValue({
        sublistId: sublistName,
        fieldId: "custpage_asset_tran_cost",
        value: tranCost,
      });
      rec.setValue({
        fieldId: "custpage_total_tran_cost",
        value: parseFloat(tranCost) + accItems,
      });
    }
  }

  // Function to perform search and get asset cost
  function getAssetCost(assetId) {
    var cost = search.lookupFields({
      type: "customrecord_ncfar_asset",
      id: assetId,
      columns: ["custrecord_assetbookvalue"],
    });

    return cost.custrecord_assetbookvalue || 0; // Return the cost or 0 if not found
  }

  function getTransCost(lineUniqueKey) {
    var transactionSearch = search.create({
      type: "transaction",
      filters: [["lineuniquekey", search.Operator.EQUALTO, lineUniqueKey]],
      columns: ["debitamount"],
    });

    var transactionResults = transactionSearch
      .run()
      .getRange({ start: 0, end: 1 });
    var accountId = transactionResults[0].getValue("debitamount");
    return accountId || 0; // Return the cost or 0 if not found
  }

  // Validate line before adding to the sublist
  function validateLine(context) {
    var rec = currentRecord.get();
    var sublistName = context.sublistId;

    if (sublistName === "custpage_assets_sublist") {
      var assetId = rec.getCurrentSublistValue({
        sublistId: sublistName,
        fieldId: "custpage_asset",
      });

      if (!assetId) {
        alert("Asset cannot be empty.");
        return false;
      }

      if (isDuplicateAsset(rec, sublistName, assetId)) {
        alert("Duplicate asset selected: " + assetId);
        return false;
      }
    }

    // We are not validating transactions at the moment
    return true;
  }

  function isDuplicateAsset(rec, sublistName, assetId) {
    var lineCount = rec.getLineCount({ sublistId: sublistName });

    for (var i = 0; i < lineCount; i++) {
      var existingAssetId = rec.getSublistValue({
        sublistId: sublistName,
        fieldId: "custpage_asset",
        line: i,
      });

      if (existingAssetId === assetId) {
        return true;
      }
    }

    return false;
  }

  // Validate before submission
  function saveRecord(context) {
    var rec = currentRecord.get();
    var assetCount = rec.getLineCount({ sublistId: "custpage_assets_sublist" });
    var transactionCount = rec.getLineCount({
      sublistId: "custpage_transaction_sublist",
    });

    if (assetCount === 0) {
      alert("At least one asset must be selected.");
      return false;
    }

    if (transactionCount === 0) {
      alert("At least one transaction line must be selected.");
      return false;
    }

    return true; // Allow save
  }

  function sublistChanged(context) {
    if (context.sublistId === "custpage_assets_sublist") {
      var rec = context.currentRecord;
      var totalAmount = 0;
      var lineCount = rec.getLineCount({
        sublistId: "custpage_assets_sublist",
      });

      for (var i = 0; i < lineCount; i++) {
        var amount = parseFloat(
          rec.getSublistValue({
            sublistId: "custpage_assets_sublist",
            fieldId: "custpage_asset_cost",
            line: i,
          }) || 0
        );
        totalAmount += amount;
      }

      rec.setValue({
        fieldId: "custpage_total_amount",
        value: totalAmount.toFixed(2),
      });
    }
    if (context.sublistId === "custpage_transaction_sublist") {
      var rec = context.currentRecord;
      var totalAmount = 0;
      var lineCount = rec.getLineCount({
        sublistId: context.sublistId,
      });
      var amountField = "custpage_asset_tran_cost";

      for (var i = 0; i < lineCount; i++) {
        var amount = parseFloat(
          rec.getSublistValue({
            sublistId: context.sublistId,
            fieldId: amountField,
            line: i,
          }) || 0
        );
        totalAmount += amount;
      }

      rec.setValue({
        fieldId: "custpage_total_tran_cost",
        value: totalAmount.toFixed(2),
      });
    }
  }

  function formatDateForNetSuite(date) {
    var month = date.getMonth() + 1;
    var day = date.getDate();
    var year = date.getFullYear();
    return day + "/" + month + "/" + year;
  }

  function applyFilters() {
    var rec = currentRecord.get();
    var initDate = formatDateForNetSuite(
      rec.getValue({ fieldId: "custpage_filter_date_initial" })
    );
    var finalDate = formatDateForNetSuite(
      rec.getValue({ fieldId: "custpage_filter_date_final" })
    );
    var filterType = rec.getValue({ fieldId: "custpage_filter_type" });
    var suiteletUrl = url.resolveScript({
      scriptId: "customscript1359",
      deploymentId: "customdeploy1",
      params: {
        filterInitDate: initDate,
        filterEndDate: finalDate,
        filterType: filterType
      },
    });
    window.location.href = suiteletUrl;
  }

  return {
    fieldChanged: fieldChanged,
    validateLine: validateLine,
    saveRecord: saveRecord,
    sublistChanged: sublistChanged,
    applyFilters: applyFilters,
  };
});
