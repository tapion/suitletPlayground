/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 */

define([
  "N/record",
  "N/search",
  "N/task",
  "N/runtime",
  "N/format",
  "N/log",
], function (record, search, task, runtime, format, log) {
  function execute(context) {
    log.debug("Hola se ejecuto 0");
    try {
      log.debug("Hola se ejecuto 1");
      var script = runtime.getCurrentScript();
      var usageThreshold = 9900;

      log.audit("Script Start", "Scheduled script execution started.");

      // Search for assets with Asset Usage method, allocated status, and a non-empty customer field
      var assetSearch = search.create({
        type: "customrecord_ncfar_asset",
        filters: [
          ["custrecord_assetaccmethod", "anyof", "2"], // Asset Usage method
          "AND",
          ["custrecord_asset_allctstatus", "anyof", "2"], // Allocated status
          "AND",
          ["custrecord_asset_customer", "noneof", "@NONE@"], // Customer field is not empty
        ],
        columns: ["internalid"],
      });
      log.debug("assetSearch", assetSearch);
      var currentDate = new Date();
      var assetCount = 0;
      var created = 0;
      var formattedDateRow = format.parse({
        value: currentDate,
        type: format.Type.DATE,
      });
      var formattedDate =
        getMonthInLetters(formattedDateRow) +
        " " +
        formattedDateRow.getFullYear();
      log.debug("formattedDate", formattedDate);

      assetSearch.run().each(function (assetResult) {
        var assetId = assetResult.getValue({ name: "internalid" });
        log.debug("assetId", assetId);
        var temporal = search.create({
          type: "customrecord_ncfar_assetusage",
          filters: [
            ["custrecord_usageassetid", "is", assetId],
            "AND",
            ["custrecord_usageperiod", "is", formattedDate],
          ],
          columns: ["custrecord_usageassetid"],
        });
        log.debug("temporal", temporal);

        var searchResultCount = temporal.runPaged().count;
        assetCount++;

        log.debug("Consultas realizadas", assetCount);

        if (searchResultCount == 0) {
          // currentDate
          var assetUsageRecord = record.create({
            type: "customrecord_ncfar_assetusage",
            isDynamic: true,
          });

          // Set the values
          assetUsageRecord.setValue({
            fieldId: "custrecord_usageassetid",
            value: assetId,
          });

          assetUsageRecord.setValue({
            fieldId: "custrecord_usagedate",
            value: currentDate,
          });
          assetUsageRecord.setValue({
            fieldId: "custrecord_usageperiod",
            value: formattedDate,
          });
          assetUsageRecord.setValue({
            fieldId: "custrecord_usageunits",
            value: 1,
          });
          created++;
          log.debug("Creo: ",created );
          assetUsageRecord.save();
        }

        return true; // Continue processing
      });
      log.debug("Hola se termino 1");
      log.audit("Script Completed", "Processed " + assetCount + " assets.");
    } catch (e) {
      log.error("Error executing scheduled script", e.message);
    }
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

  return {
    execute: execute,
  };
});
