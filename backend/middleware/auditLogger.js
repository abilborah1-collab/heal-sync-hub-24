const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

exports.logAudit = (action, resource) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      res.send = originalSend;
      
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const auditData = {
          user: req.user?._id,
          action,
          resource,
          resourceId: req.params.id || req.body._id,
          changes: action === 'update' ? req.body : undefined,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        };

        AuditLog.create(auditData).catch(err => {
          logger.error('Audit log creation failed:', err);
        });
      }
      
      return res.send(data);
    };
    
    next();
  };
};
