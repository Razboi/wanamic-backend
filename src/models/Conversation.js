const
	mongoose = require( "mongoose" ),
	Schema = mongoose.Schema,

	ConversationSchema = mongoose.Schema({
		author: { type: String, required: true },
		target: { type: String, required: true },
		messages: [ { type: Schema.Types.ObjectId, ref: "Message" } ]
	}, { timestamps: true }),


	Conversation = mongoose.model( "Conversation", ConversationSchema );

module.exports = Conversation;
