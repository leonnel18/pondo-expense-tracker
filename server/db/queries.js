const db = require('./schema');

// Account queries
const getAccounts = (sort = 'name', order = 'ASC') => {
  return new Promise((resolve, reject) => {
    let orderBy;
    switch(sort) {
      case 'balance':
        // For balance sorting, we need to calculate it
        orderBy = 'a.name'; // We'll sort in memory for now
        break;
      case 'type':
        orderBy = 'a.type';
        break;
      default:
        orderBy = 'a.name';
    }

    const sql = `
      SELECT a.id, a.name, a.type, a.description, a.emoji, a.created_at, a.updated_at,
        COUNT(e.id) as entry_count
      FROM accounts a
      LEFT JOIN entries e ON e.account_id = a.id
      GROUP BY a.id
      ORDER BY ${orderBy} ${order}`;

    db.all(sql, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        // If sorting by balance, we need to calculate and re-sort
        if (sort === 'balance') {
          const accountsWithBalances = rows.map(account => {
            return new Promise((resolveBalance, rejectBalance) => {
              const balanceSql = `
                SELECT 
                  COALESCE(SUM(CASE WHEN e.type = 'income' THEN e.amount ELSE 0 END), 0) as total_income,
                  COALESCE(SUM(CASE WHEN e.type = 'expense' THEN e.amount ELSE 0 END), 0) as total_expense
                FROM entries e WHERE e.account_id = ?`;
              
              db.get(balanceSql, [account.id], (balanceErr, balanceRow) => {
                if (balanceErr) {
                  rejectBalance(balanceErr);
                } else {
                  let balance = 0;
                  switch(account.type) {
                    case 'debit':
                    case 'invest':
                      balance = balanceRow.total_income - balanceRow.total_expense;
                      break;
                    case 'credit':
                    case 'lent':
                      balance = balanceRow.total_expense - balanceRow.total_income;
                      break;
                    case 'borrowed':
                      balance = balanceRow.total_income - balanceRow.total_expense;
                      break;
                  }
                  resolveBalance({...account, balance});
                }
              });
            });
          });
          
          Promise.all(accountsWithBalances)
            .then(accounts => {
              accounts.sort((a, b) => {
                return order === 'ASC' ? a.balance - b.balance : b.balance - a.balance;
              });
              resolve(accounts);
            })
            .catch(reject);
        } else {
          resolve(rows);
        }
      }
    });
  });
};

const getAccountById = (id) => {
  return new Promise((resolve, reject) => {
    const sql = `SELECT id, name, type, description, emoji, created_at, updated_at FROM accounts WHERE id = ?`;
    db.get(sql, [id], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const getAccountBalance = (id) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        a.type as account_type,
        COALESCE(SUM(CASE WHEN e.type = 'income' THEN e.amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN e.type = 'expense' THEN e.amount ELSE 0 END), 0) as total_expense
      FROM accounts a
      LEFT JOIN entries e ON a.id = e.account_id
      WHERE a.id = ?
      GROUP BY a.type`;
    
    db.get(sql, [id], (err, row) => {
      if (err) {
        reject(err);
      } else if (!row) {
        resolve(0);
      } else {
        let balance = 0;
        switch(row.account_type) {
          case 'debit':
          case 'invest':
            balance = row.total_income - row.total_expense;
            break;
          case 'credit':
          case 'lent':
            balance = row.total_expense - row.total_income;
            break;
          case 'borrowed':
            balance = row.total_income - row.total_expense;
            break;
        }
        resolve(balance);
      }
    });
  });
};

const createAccount = (account) => {
  return new Promise((resolve, reject) => {
    const { name, type, description, emoji } = account;
    const sql = `INSERT INTO accounts (name, type, description, emoji) VALUES (?, ?, ?, ?)`;
    db.run(sql, [name, type, description, emoji || null], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, ...account });
      }
    });
  });
};

const updateAccount = (id, account) => {
  return new Promise((resolve, reject) => {
    const { name, type, description, emoji } = account;
    const sql = `UPDATE accounts SET name = ?, type = ?, description = ?, emoji = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    db.run(sql, [name, type, description, emoji || null, id], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id, ...account });
      }
    });
  });
};

const deleteAccount = (id) => {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM accounts WHERE id = ?`;
    db.run(sql, [id], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id });
      }
    });
  });
};

const getAccountEntryCount = (id) => {
  return new Promise((resolve, reject) => {
    db.get(`SELECT COUNT(*) as count FROM entries WHERE account_id = ?`, [id], (err, row) => {
      if (err) reject(err); else resolve(row.count);
    });
  });
};

const reassignAccountEntries = (fromId, toId) => {
  return new Promise((resolve, reject) => {
    db.run(`UPDATE entries SET account_id = ?, updated_at = CURRENT_TIMESTAMP WHERE account_id = ?`, [toId, fromId], function(err) {
      if (err) reject(err); else resolve({ reassigned: this.changes });
    });
  });
};

const deleteEntriesByAccount = (id) => {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM entries WHERE account_id = ?`, [id], function(err) {
      if (err) reject(err); else resolve({ deleted: this.changes });
    });
  });
};

// Category queries
const getCategories = (type = null) => {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT c.id, c.name, c.type, c.color, c.icon, c.is_default, c.sort_order, c.created_at, c.updated_at,
        COUNT(e.id) as entry_count
      FROM categories c
      LEFT JOIN entries e ON e.category_id = c.id`;
    const params = [];

    if (type) {
      sql += ` WHERE c.type = ?`;
      params.push(type);
    }

    sql += ` GROUP BY c.id ORDER BY c.sort_order ASC, c.name ASC`;

    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const getCategoryById = (id) => {
  return new Promise((resolve, reject) => {
    const sql = `SELECT id, name, type, color, icon, is_default, sort_order, created_at, updated_at FROM categories WHERE id = ?`;
    db.get(sql, [id], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const createCategory = (category) => {
  return new Promise((resolve, reject) => {
    const { name, type, color, icon } = category;
    const sql = `INSERT INTO categories (name, type, color, icon) VALUES (?, ?, ?, ?)`;
    db.run(sql, [name, type, color, icon || null], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, ...category });
      }
    });
  });
};

const updateCategory = (id, category) => {
  return new Promise((resolve, reject) => {
    const { name, color, icon } = category;
    const sql = `UPDATE categories SET name = ?, color = ?, icon = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    db.run(sql, [name, color, icon || null, id], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id, ...category });
      }
    });
  });
};

const deleteCategory = (id) => {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM categories WHERE id = ?`;
    db.run(sql, [id], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id });
      }
    });
  });
};

const getCategoryEntryCount = (id) => {
  return new Promise((resolve, reject) => {
    db.get(`SELECT COUNT(*) as count FROM entries WHERE category_id = ?`, [id], (err, row) => {
      if (err) reject(err); else resolve(row.count);
    });
  });
};

const getFallbackCategory = (type) => {
  return new Promise((resolve, reject) => {
    const fallbackName = type === 'income' ? 'Other Income' : 'Other';
    db.get(`SELECT id, name, type FROM categories WHERE type = ? AND name = ?`, [type, fallbackName], (err, row) => {
      if (err) reject(err); else resolve(row);
    });
  });
};

const reassignCategoryEntries = (fromId, toId) => {
  return new Promise((resolve, reject) => {
    db.run(`UPDATE entries SET category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE category_id = ?`, [toId, fromId], function(err) {
      if (err) reject(err); else resolve({ reassigned: this.changes });
    });
  });
};

// Entry queries
const getEntries = (filters = {}) => {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT
        e.id, e.type, e.amount, e.note, e.date, e.created_at, e.updated_at,
        e.account_id, e.category_id,
        c.name as category_name, c.color as category_color, c.icon as category_emoji,
        a.name as account_name, a.type as account_type, a.emoji as account_emoji
      FROM entries e
      JOIN categories c ON e.category_id = c.id
      JOIN accounts a ON e.account_id = a.id
    `;
    
    const params = [];
    const whereConditions = [];
    
    if (filters.type) {
      whereConditions.push('e.type = ?');
      params.push(filters.type);
    }
    
    if (filters.category_id) {
      whereConditions.push('e.category_id = ?');
      params.push(filters.category_id);
    }
    
    if (filters.account_id) {
      whereConditions.push('e.account_id = ?');
      params.push(filters.account_id);
    }
    
    if (filters.from) {
      whereConditions.push('e.date >= ?');
      params.push(filters.from);
    }
    
    if (filters.to) {
      whereConditions.push('e.date <= ?');
      params.push(filters.to);
    }
    
    if (filters.search) {
      whereConditions.push('(e.note LIKE ?)');
      params.push(`%${filters.search}%`);
    }
    
    if (whereConditions.length > 0) {
      sql += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    sql += ' ORDER BY e.date DESC, e.created_at DESC';
    
    if (filters.limit || filters.offset !== undefined) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(filters.limit || 10);
      params.push(filters.offset || 0);
    }
    
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const getEntryById = (id) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        e.id, e.type, e.amount, e.note, e.date, e.created_at, e.updated_at,
        e.account_id, e.category_id,
        c.name as category_name, c.color as category_color, c.icon as category_emoji,
        a.name as account_name, a.type as account_type, a.emoji as account_emoji
      FROM entries e
      JOIN categories c ON e.category_id = c.id
      JOIN accounts a ON e.account_id = a.id
      WHERE e.id = ?`;
    
    db.get(sql, [id], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const createEntry = (entry) => {
  return new Promise((resolve, reject) => {
    const { type, amount, account_id, category_id, note, date } = entry;
    const sql = `INSERT INTO entries (type, amount, account_id, category_id, note, date) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [type, amount, account_id, category_id, note, date], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, ...entry });
      }
    });
  });
};

const updateEntry = (id, entry) => {
  return new Promise((resolve, reject) => {
    const { type, amount, account_id, category_id, note, date } = entry;
    const sql = `UPDATE entries SET type = ?, amount = ?, account_id = ?, category_id = ?, note = ?, date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    db.run(sql, [type, amount, account_id, category_id, note, date, id], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id, ...entry });
      }
    });
  });
};

const deleteEntry = (id) => {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM entries WHERE id = ?`;
    db.run(sql, [id], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id });
      }
    });
  });
};

const bulkDeleteEntries = (ids) => {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(ids) || ids.length === 0) {
      return resolve({ deleted: 0 });
    }
    const placeholders = ids.map(() => '?').join(',');
    const sql = `DELETE FROM entries WHERE id IN (${placeholders})`;
    db.run(sql, ids, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ deleted: this.changes });
      }
    });
  });
};

const getEntriesForExport = (from = null, to = null) => {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT
        e.id, e.type, e.amount, e.date,
        c.name as category, a.name as account,
        e.note, e.created_at, e.updated_at
      FROM entries e
      JOIN categories c ON e.category_id = c.id
      JOIN accounts a ON e.account_id = a.id
    `;
    const params = [];
    const whereConditions = [];
    if (from) {
      whereConditions.push('e.date >= ?');
      params.push(from);
    }
    if (to) {
      whereConditions.push('e.date <= ?');
      params.push(to);
    }
    if (whereConditions.length > 0) {
      sql += ' WHERE ' + whereConditions.join(' AND ');
    }
    sql += ' ORDER BY e.date DESC, e.created_at DESC';

    db.all(sql, params, (err, rows) => {
      if (err) reject(err); else resolve(rows);
    });
  });
};

const getAccountsForExport = () => {
  return new Promise((resolve, reject) => {
    const sql = `SELECT id, name, type, description FROM accounts ORDER BY name ASC`;
    db.all(sql, [], (err, rows) => {
      if (err) reject(err); else resolve(rows);
    });
  });
};

// Dashboard queries
const getExpenseBreakdown = (from = null, to = null) => {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT c.id as category_id, c.name as category_name, c.color as category_color, c.icon as category_icon,
        COALESCE(SUM(e.amount), 0) as total
      FROM entries e
      JOIN categories c ON e.category_id = c.id
      WHERE e.type = 'expense'
    `;
    const params = [];
    if (from) {
      sql += ' AND e.date >= ?';
      params.push(from);
    }
    if (to) {
      sql += ' AND e.date <= ?';
      params.push(to);
    }
    sql += ' GROUP BY c.id, c.name, c.color, c.icon ORDER BY total DESC';

    db.all(sql, params, (err, rows) => {
      if (err) reject(err); else resolve(rows);
    });
  });
};

const getIncomeBreakdown = (from = null, to = null) => {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT c.id as category_id, c.name as category_name, c.color as category_color, c.icon as category_icon,
        COALESCE(SUM(e.amount), 0) as total
      FROM entries e
      JOIN categories c ON e.category_id = c.id
      WHERE e.type = 'income'
    `;
    const params = [];
    if (from) {
      sql += ' AND e.date >= ?';
      params.push(from);
    }
    if (to) {
      sql += ' AND e.date <= ?';
      params.push(to);
    }
    sql += ' GROUP BY c.id, c.name, c.color, c.icon ORDER BY total DESC';

    db.all(sql, params, (err, rows) => {
      if (err) reject(err); else resolve(rows);
    });
  });
};

const getDashboardMoM = (from = null, to = null) => {
  return new Promise((resolve, reject) => {
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from ? new Date(from) : new Date(toDate.getFullYear(), toDate.getMonth(), 1);
    const periodMs = toDate.getTime() - fromDate.getTime();
    const prevTo = new Date(fromDate.getTime() - 24 * 60 * 60 * 1000);
    const prevFrom = new Date(prevTo.getTime() - periodMs);
    const fmt = (d) => d.toISOString().split('T')[0];

    const periodSql = `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses
      FROM entries WHERE date >= ? AND date <= ?`;

    db.get(periodSql, [fmt(fromDate), fmt(toDate)], (err, current) => {
      if (err) return reject(err);
      db.get(periodSql, [fmt(prevFrom), fmt(prevTo)], (err2, previous) => {
        if (err2) return reject(err2);

        const pctChange = (curr, prev) => {
          if (!prev) return curr > 0 ? 100 : 0;
          return ((curr - prev) / prev) * 100;
        };

        resolve({
          current: { total_income: current.total_income, total_expenses: current.total_expenses },
          previous: { total_income: previous.total_income, total_expenses: previous.total_expenses },
          income_change_pct: pctChange(current.total_income, previous.total_income),
          expense_change_pct: pctChange(current.total_expenses, previous.total_expenses)
        });
      });
    });
  });
};

const getDashboardKPIs = (from = null, to = null) => {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses
      FROM entries
    `;
    
    const params = [];
    const whereConditions = [];
    
    if (from) {
      whereConditions.push('date >= ?');
      params.push(from);
    }
    
    if (to) {
      whereConditions.push('date <= ?');
      params.push(to);
    }
    
    if (whereConditions.length > 0) {
      sql += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        const net_balance = row.total_income - row.total_expenses;
        
        // Calculate total balance across all accounts
        const balanceSql = `
          SELECT 
            a.id, a.type,
            COALESCE(SUM(CASE WHEN e.type = 'income' THEN e.amount ELSE 0 END), 0) as total_income,
            COALESCE(SUM(CASE WHEN e.type = 'expense' THEN e.amount ELSE 0 END), 0) as total_expense
          FROM accounts a
          LEFT JOIN entries e ON a.id = e.account_id
          GROUP BY a.id, a.type`;
        
        db.all(balanceSql, [], (balanceErr, balanceRows) => {
          if (balanceErr) {
            reject(balanceErr);
          } else {
            let total_balance = 0;
            balanceRows.forEach(account => {
              switch(account.type) {
                case 'debit':
                case 'invest':
                  total_balance += (account.total_income - account.total_expense);
                  break;
                case 'credit':
                case 'lent':
                  total_balance += (account.total_expense - account.total_income);
                  break;
                case 'borrowed':
                  total_balance += (account.total_income - account.total_expense);
                  break;
              }
            });
            
            resolve({
              total_income: row.total_income,
              total_expenses: row.total_expenses,
              net_balance,
              total_balance
            });
          }
        });
      }
    });
  });
};

const getDashboardAccounts = () => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        a.id, a.name, a.type, a.emoji,
        COALESCE(SUM(CASE WHEN e.type = 'income' THEN e.amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN e.type = 'expense' THEN e.amount ELSE 0 END), 0) as total_expense
      FROM accounts a
      LEFT JOIN entries e ON a.id = e.account_id
      GROUP BY a.id, a.name, a.type, a.emoji`;
    
    db.all(sql, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const accountsWithBalances = rows.map(account => {
          let balance = 0;
          switch(account.type) {
            case 'debit':
            case 'invest':
              balance = account.total_income - account.total_expense;
              break;
            case 'credit':
            case 'lent':
              balance = account.total_expense - account.total_income;
              break;
            case 'borrowed':
              balance = account.total_income - account.total_expense;
              break;
          }
          return {...account, balance};
        });
        
        resolve(accountsWithBalances);
      }
    });
  });
};

const getRecentEntries = (from = null, to = null, limit = 5) => {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT 
        e.id, e.type, e.amount, e.note, e.date, e.created_at,
        c.name as category_name, c.color as category_color, c.icon as category_emoji,
        a.name as account_name, a.type as account_type, a.emoji as account_emoji
      FROM entries e
      JOIN categories c ON e.category_id = c.id
      JOIN accounts a ON e.account_id = a.id
    `;
    
    const params = [];
    const whereConditions = [];
    
    if (from) {
      whereConditions.push('e.date >= ?');
      params.push(from);
    }
    
    if (to) {
      whereConditions.push('e.date <= ?');
      params.push(to);
    }
    
    if (whereConditions.length > 0) {
      sql += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    sql += ' ORDER BY e.date DESC, e.created_at DESC LIMIT ?';
    params.push(limit);
    
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Settings queries
const getSetting = (key) => {
  return new Promise((resolve, reject) => {
    db.get(`SELECT value FROM settings WHERE key = ?`, [key], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row ? row.value : undefined);
      }
    });
  });
};

const setSetting = (key, value) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve({ key, value });
        }
      }
    );
  });
};

// Export all functions
module.exports = {
  // Account queries
  getAccounts,
  getAccountById,
  getAccountBalance,
  createAccount,
  updateAccount,
  deleteAccount,
  getAccountEntryCount,
  reassignAccountEntries,
  deleteEntriesByAccount,

  // Category queries
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryEntryCount,
  getFallbackCategory,
  reassignCategoryEntries,

  // Entry queries
  getEntries,
  getEntryById,
  createEntry,
  updateEntry,
  deleteEntry,
  bulkDeleteEntries,
  getEntriesForExport,
  getAccountsForExport,

  // Dashboard queries
  getDashboardKPIs,
  getDashboardMoM,
  getExpenseBreakdown,
  getIncomeBreakdown,
  getDashboardAccounts,
  getRecentEntries,

  // Settings queries
  getSetting,
  setSetting
};