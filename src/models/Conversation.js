const
	mongoose = require( "mongoose" ),
	Schema = mongoose.Schema,

	ConversationSchema = mongoose.Schema({
		author: { type: Schema.Types.ObjectId, ref: "User", required: true },
		target: { type: Schema.Types.ObjectId, ref: "User", required: true },
		messages: [
			{ type: Schema.Types.ObjectId, required: true, ref: "Message" }
		],
		bothOpen: { type: Boolean, default: true },
		newMessagesCount: { type: Number, default: 0 },
	}, { timestamps: true }),


	Conversation = mongoose.model( "Conversation", ConversationSchema );

module.exports = Conversation;
