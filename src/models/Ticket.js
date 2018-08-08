const
	mongoose = require( "mongoose" ),
	Schema = mongoose.Schema,


	TicketSchema = mongoose.Schema({
		author: { type: Schema.Types.ObjectId, ref: "User", required: true },
		target: { type: Schema.Types.ObjectId, ref: "User" },
		content: { type: String, required: true },
		fromDeletedAccount: { type: Boolean, default: false },
		fromReport: { type: Boolean, default: false }
	}, { timestamps: true }),

	Ticket = mongoose.model( "Ticket", TicketSchema );

module.exports = Ticket;
