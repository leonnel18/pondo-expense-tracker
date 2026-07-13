const bcrypt = require('bcrypt');
const { getSetting } = require('../db/queries');

const authMiddleware = async (req, res, next) => {
  try {
    // Check if passphrase is required
    const passphraseHash = await getSetting('passphrase_hash');

    // If no passphrase is set, allow access
    if (!passphraseHash) {
      return next();
    }

    // Get passphrase from header
    const passphrase = req.headers['x-app-passphrase'];

    // If no passphrase provided, return 401
    if (!passphrase) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Passphrase required'
        }
      });
    }

    // Check passphrase
    const isValid = bcrypt.compareSync(passphrase, passphraseHash);

    if (!isValid) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid passphrase'
        }
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authMiddleware;