/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(["N/record", "N/search"], function (record, search) {
  function beforeSubmit(context) {
    if (context.type !== context.UserEventType.CREATE) return;

    var itemReceipt = context.newRecord;
    var ReturnAuthID = itemReceipt.getValue({ fieldId: "createdfrom" });

    var returnaut = record.load({
      type: "returnauthorization",
      id: ReturnAuthID,
    });
    var createdFromId = returnaut.getValue({ fieldId: "createdfrom" });

    // Asegurarse de que el Item Receipt está relacionado con una Sales Order
    if (createdFromId) {
      // Cargar la Sales Order para obtener el Average Cost
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
        itemReceipt.setSublistValue({
          sublistId: "item",
          fieldId: "overriderate",
          line: i,
          value: average || 0, // Default a 0 si no hay costo promedio
        });
        itemReceipt.setSublistValue({
          sublistId: "item",
          fieldId: "itemdescription",
          line: i,
          value: 'Miguel, ahii Miguel', // Default a 0 si no hay costo promedio
        });

        // Obtener el valor del Average Cost desde la Sales Order
        // var averageCost = salesOrder.getSublistValue({
        //   sublistId: "item",
        //   fieldId: "averagecost", // Campo AVERAGE COST en la Sales Order
        //   line: i,
        // });
        // log.debug("id", i);
        // log.debug("average cost", averageCost);
        // // Asignar el valor al campo Override Rate en el Item Receipt
        // itemReceipt.setSublistValue({
        //   sublistId: "item",
        //   fieldId: "custcol_average_cost_so",
        //   line: i,
        //   value: averageCost || 0, // Default a 0 si no hay costo promedio
        // });
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
        // fieldId: 'averagecost', // Campo AVERAGE COST en la Sales Order
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
    beforeSubmit: beforeSubmit,
  };
});
