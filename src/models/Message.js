const
	mongoose = require( "mongoose" ),
	Schema = mongoose.Schema,

	MessageSchema = mongoose.Schema({
		author: { type: Schema.Types.ObjectId, ref: "User", required: true },
		receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
		content: { type: String, required: true }
	}, { timestamps: true }),


	Message = mongoose.model( "Message", MessageSchema );

module.exports = Message;
