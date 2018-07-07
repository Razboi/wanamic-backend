const
	mongoose = require( "mongoose" ),
	Schema = mongoose.Schema,


	TicketSchema = mongoose.Schema({
		author: { type: String, required: true },
		target: { type: String },
		content: { type: String, required: true },
		fromDeletedAccount: { type: Boolean, default: false },
		fromReport: { type: Boolean, default: false }
	}, { timestamps: true }),

	Ticket = mongoose.model( "Ticket", TicketSchema );

module.exports = Ticket;
