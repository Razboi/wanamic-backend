const
	mongoose = require( "mongoose" ),
	Schema = mongoose.Schema,

	NotificationSchema = mongoose.Schema({
		author: { type: String, required: true },
		receiver: { type: String, required: true },
		content: { type: String },
		object: { type: String },
		checked: { type: Boolean, default: false }
	}, { timestamps: true }),


	Notification = mongoose.model( "Notification", NotificationSchema );

module.exports = Notification;
