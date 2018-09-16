const
	mongoose = require( "mongoose" ),
	Schema = mongoose.Schema,

	ClubSchema = mongoose.Schema({
		president: { type: Schema.Types.ObjectId, ref: "User", required: true },
		moderators: [ { type: Schema.Types.ObjectId, ref: "User" } ],
		name: { type: String, required: true },
		title: { type: String, required: true },
		description: { type: String, required: true },
		members: [ { type: Schema.Types.ObjectId, ref: "User" } ],
		feed: [ { type: Schema.Types.ObjectId, ref: "Post" } ],
		approved: { type: Boolean, default: false },
		image: { type: String },
		bannedUsers: [ { type: Schema.Types.ObjectId, ref: "User" } ]
	}, { timestamps: true }),


	Club = mongoose.model( "Club", ClubSchema );

// middleware will only fire for ModelDocument.remove

module.exports = Club;
