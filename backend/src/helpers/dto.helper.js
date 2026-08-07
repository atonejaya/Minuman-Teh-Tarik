class DTOHelper {
  static toUser(user) {
    if (!user) return null;
    const { password_hash, refresh_token, deleted_at, ...safeUser } = user;
    return safeUser;
  }

  static toProduct(product) {
    if (!product) return null;
    const { deleted_at, ...safeProduct } = product;
    return safeProduct;
  }

  static toWarung(warung) {
    if (!warung) return null;
    const { deleted_at, ...safeWarung } = warung;
    return safeWarung;
  }

  static toWarehouseStock(stock) {
    if (!stock) return null;
    const { id, warehouse_id, product_id, batch_id, version, ...safeStock } = stock;
    return safeStock;
  }

  static toMobileStock(stock) {
    if (!stock) return null;
    const { id, sales_id, product_id, batch_id, version, ...safeStock } = stock;
    return safeStock;
  }

  static toInventoryMovement(movement) {
    if (!movement) return null;
    const { id, source_id, destination_id, product_id, batch_id, created_by, ...safeMovement } = movement;
    return safeMovement;
  }

  static toSalesTransactionItem(item) {
    if (!item) return null;
    const { sales_transaction_id, product_id, batch_id, product, batch, ...safeItem } = item;
    return safeItem;
  }

  static toSalesTransaction(transaction) {
    if (!transaction) return null;
    const { visit_id, sales_id, warung_id, items, ...safeTx } = transaction;
    
    if (items) {
      safeTx.items = this.toList(items, this.toSalesTransactionItem);
    }
    
    return safeTx;
  }

  static toPayment(payment) {
    if (!payment) return null;
    const { transaction_id, created_by, ...safePayment } = payment;
    return safePayment;
  }

  static toPaymentList(payments) {
    return this.toList(payments, this.toPayment);
  }

  static toCollectionItem(item) {
    if (!item) return null;
    const { collection_id, sales_transaction_id, ...safeItem } = item;
    if (item.sales_transaction) {
      safeItem.sales_transaction = this.toSalesTransaction(item.sales_transaction);
    }
    return safeItem;
  }

  static toCollection(collection) {
    if (!collection) return null;
    const { sales_id, warung_id, visit_id, items, payments, ...safeCollection } = collection;
    return safeCollection;
  }

  static toCollectionDetail(collection) {
    if (!collection) return null;
    const safeCollection = this.toCollection(collection);
    
    if (collection.items) {
      safeCollection.items = this.toList(collection.items, this.toCollectionItem);
    }
    if (collection.payments) {
      safeCollection.payments = this.toList(collection.payments, this.toPayment);
    }
    if (collection.summary) {
      safeCollection.summary = collection.summary;
    }
    
    return safeCollection;
  }

  // Generic mapper for lists
  static toList(data, mapperFunction) {
    if (!Array.isArray(data)) return [];
    return data.map(mapperFunction.bind(this));
  }

  // --- SALES RETURN & CREDIT NOTE ---

  static toSalesReturn(sr) {
    if (!sr) return null;
    const safeSr = {
      id: sr.id,
      code: sr.code,
      visit_id: sr.visit_id,
      sales_id: sr.sales_id,
      warung_id: sr.warung_id,
      transaction_id: sr.transaction_id,
      status: sr.status,
      return_date: sr.return_date,
      total_amount: Number(sr.total_amount),
      notes: sr.notes,
      created_at: sr.created_at,
      updated_at: sr.updated_at
    };

    if (sr.items) {
      safeSr.items = this.toList(sr.items, this.toSalesReturnItem);
    }
    if (sr.credit_note) {
      safeSr.credit_note = this.toCreditNote(sr.credit_note);
    }
    return safeSr;
  }

  static toSalesReturnItem(item) {
    if (!item) return null;
    return {
      id: item.id,
      sales_return_id: item.sales_return_id,
      product_id: item.product_id,
      batch_id: item.batch_id,
      qty: item.qty,
      condition: item.condition,
      reason: item.reason,
      item_price: Number(item.item_price),
      subtotal: Number(item.subtotal),
      product: item.product ? this.toProduct(item.product) : undefined,
      batch: item.batch ? this.toProductBatch(item.batch) : undefined
    };
  }

  static toCreditNote(note) {
    if (!note) return null;
    return {
      id: note.id,
      code: note.code,
      warung_id: note.warung_id,
      sales_return_id: note.sales_return_id,
      amount: Number(note.amount),
      remaining_amount: Number(note.remaining_amount),
      status: note.status,
      created_at: note.created_at,
      updated_at: note.updated_at
    };
  }
}

module.exports = DTOHelper;
