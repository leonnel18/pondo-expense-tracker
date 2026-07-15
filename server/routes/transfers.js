const express = require('express');
const { createTransfer, updateTransfer, deleteTransfer, getTransferByGroupId } = require('../db/queries');
const { validate, createTransferSchema } = require('../middleware/validate');

const router = express.Router();

// POST /api/transfers - Create a transfer
router.post('/', validate(createTransferSchema), async (req, res, next) => {
  try {
    const payload = {
      from_account_id: req.body.from_account_id,
      to_account_id: req.body.to_account_id,
      amount: req.body.amount,
      note: req.body.note,
      date: req.body.date
    };

    const result = await createTransfer(payload);
    
    // Check if there was an error in the RPC function
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json({ transfer: result });
  } catch (error) {
    next(error);
  }
});

// PUT /api/transfers/:transferGroupId - Update a transfer
router.put('/:transferGroupId', validate(createTransferSchema), async (req, res, next) => {
  try {
    const payload = {
      transfer_group_id: req.params.transferGroupId,
      from_account_id: req.body.from_account_id,
      to_account_id: req.body.to_account_id,
      amount: req.body.amount,
      note: req.body.note,
      date: req.body.date
    };

    const result = await updateTransfer(payload);
    
    // Check if there was an error in the RPC function
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.status(200).json({ transfer: result });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/transfers/:transferGroupId - Delete a transfer
router.delete('/:transferGroupId', async (req, res, next) => {
  try {
    const result = await deleteTransfer(req.params.transferGroupId);
    
    // Check if there was an error in the RPC function
    if (result.error) {
      return res.status(404).json({ error: result.error });
    }

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/transfers/:transferGroupId - Get a transfer by group ID
router.get('/:transferGroupId', async (req, res, next) => {
  try {
    const result = await getTransferByGroupId(req.params.transferGroupId);
    
    if (!result) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    res.status(200).json({ transfer: result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;