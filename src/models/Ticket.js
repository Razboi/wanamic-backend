const
	mongoose = require( "mongoose" ),
	Schema = mongoose.Schema,


	TicketSchema = mongoose.Schema({
		author: { type: Schema.Types.ObjectId, ref: "User", required: true },
		target: { type: Schema.Types.ObjectId, ref: "User" },
		object: { type: Schema.Types.ObjectId },
		content: { type: String },
		type: { type: String },
		deleteFeedback: { type: Boolean, default: false },
		report: { type: Boolean, default: false },
		clubRequest: { type: Boolean, default: false },
		clubName: { type: String }
	}, { timestamps: true }),

	Ticket = mongoose.model( "Ticket", TicketSchema );

module.exports = Ticket;
