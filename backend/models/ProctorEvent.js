const mongoose = require('mongoose');

const proctorEventSchema = new mongoose.Schema({
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission' },
  events: [{
    type: {
      type: String,
      enum: [
        'joined', 'tab_switch', 'focus_loss', 'paste_attempt',
        'copy_attempt', 'screenshot_attempt', 'print_attempt',
        'screen_share_attempt', 'fullscreen_exit', 'right_click_attempt',
        'devtools_attempt', 'submitted', 'auto_submitted',
        'warning_received', 'reconnected', 'disconnected',
        'flagged', 'kicked'
      ]
    },
    timestamp: { type: Date, default: Date.now },
    details: { type: String, default: '' }
  }],
  isConnected: { type: Boolean, default: true },
  lastSeen: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ProctorEvent', proctorEventSchema);