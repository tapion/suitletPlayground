/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(["N/record", "N/search"], function (record, search) {
  function beforeSubmit(context) {
    console.log("context.type", context.type);
    if (
      context.type !== context.UserEventType.CREATE &&
      context.type !== context.UserEventType.EDIT
    ) {
      return;
    }

    // const returnAuth = context.newRecord;

    // // Obtener la referencia de la Orden de Venta Original
    // const salesOrderId = returnAuth.getValue({ fieldId: "createdfrom" });
    console.log("salesOrderId", salesOrderId);
    // if (!salesOrderId) {
    //     throw error.create({
    //         name: 'MISSING_SALES_ORDER',
    //         message: 'No se encontró la referencia a la Orden de Venta Original.',
    //         notifyOff: false
    //     });
    // }

    // Obtener los artículos válidos de la Orden de Venta Original
    // const validItems = getItemsFromSalesOrder(salesOrderId);

    // // Validar que los artículos de la Autorización de Devolución estén en la lista de artículos válidos
    // const lineCount = returnAuth.getLineCount({ sublistId: 'item' });
    // for (let i = 0; i < lineCount; i++) {
    //     const itemId = returnAuth.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });

    //     if (!validItems.includes(itemId)) {
    //         throw error.create({
    //             name: 'INVALID_ITEM',
    //             message: `El artículo con ID ${itemId} no está asociado a la Orden de Venta Original.`,
    //             notifyOff: false
    //         });
    //     }
    // }
  }

  function fieldChanged(context) {
    console.log("fieldChanged", context);
    // var fieldId = context.fieldId;
    // if (
    //   context.sublistId === "item" &&
    //   fieldId === "custpage_asset"
    // ) {
    // }
  }

  function sublistChanged(context) {
    console.log("sublistChanged", context);
    // var fieldId = context.fieldId;
    // if (
    //   context.sublistId === "item" &&
    //   fieldId === "custpage_asset"
    // ) {
    // }
  }

  return {
    // beforeSubmit: beforeSubmit,
    fieldChanged: fieldChanged,
    sublistChanged: sublistChanged
  };
});
