const
	mongoose = require( "mongoose" ),
	Schema = mongoose.Schema,

	MessageSchema = mongoose.Schema({
		author: { type: String, required: true },
		receiver: { type: String, required: true },
		content: { type: String, required: true }
	}, { timestamps: true }),


	Message = mongoose.model( "Message", MessageSchema );

module.exports = Message;
