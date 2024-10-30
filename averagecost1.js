/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(["N/record", "N/search"], function (record, search) {
  function afterSubmit(context) {
    if (context.type !== context.UserEventType.CREATE) return;

    var itemReceipt = context.newRecord;
    var ReturnAuthID = itemReceipt.getValue({ fieldId: "createdfrom" });

    var returnaut = record.load({
      type: "returnauthorization",
      id: ReturnAuthID,
    });
    var createdFromId = returnaut.getValue({ fieldId: "createdfrom" });

    if (createdFromId) {
      var salesOrder = record.load({
        type: "salesorder",
        id: createdFromId,
      });

      var itemCount = itemReceipt.getLineCount({ sublistId: "item" });

      for (var i = 0; i < itemCount; i++) {
        log.debug("index", i);
        var item = itemReceipt.getSublistValue({
          sublistId: "item",
          fieldId: "item",
          line: i,
        });
        log.debug("item", item);
        var average = getAverageCost(salesOrder, item);
        log.debug("average", average);
        var valuesToSave = {};
        valuesToSave["item." + i + ".overriderate"] = average || 0;
        record.submitFields({
          type: "itemreceipt",
          id: itemReceipt.id,
          values: valuesToSave,
          options: {
            enableSourcing: false,
            ignoreMandatoryFields: true,
          },
        });
      }
    }
  }

  function getAverageCost(salesOrder, returnItem) {
    var itemCount = salesOrder.getLineCount({ sublistId: "item" });
    for (var i = 0; i < itemCount; i++) {
      log.debug("index getAverageCost", i);
      var item = salesOrder.getSublistValue({
        sublistId: "item",
        fieldId: "item",
        line: i,
      });
      log.debug("Sales Order Item", item);
      if (item == returnItem) {
        return salesOrder.getSublistValue({
          sublistId: "item",
          fieldId: "averagecost", // Campo AVERAGE COST en la Sales Order
          line: i,
        });
      }
    }
  }

  return {
    afterSubmit: afterSubmit,
  };
});
