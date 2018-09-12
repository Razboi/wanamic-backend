const
	mongoose = require( "mongoose" ),
	Schema = mongoose.Schema,

	NotificationSchema = mongoose.Schema({
		author: { type: Schema.Types.ObjectId, ref: "User", required: true },
		receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
		content: { type: String },
		mediaImg: { type: String },
		externalImg: { type: Boolean, default: false },
		object: { type: String },
		comment: { type: Boolean, default: false },
		follow: { type: Boolean, default: false },
		friendRequest: { type: Boolean, default: false },
		alert: { type: Boolean, default: false },
		clubRequestResponse: { type: Boolean, default: false },
		clubName: { type: String },
		clubSuccession: { type: Boolean, default: false }
	}, { timestamps: true }),


	Notification = mongoose.model( "Notification", NotificationSchema );

// middleware will only fire for ModelDocument.remove

module.exports = Notification;
