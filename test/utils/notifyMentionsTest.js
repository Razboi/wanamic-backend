const
	chai = require( "chai" ),
	expect = chai.expect,
	mongoose = require( "mongoose" ),
	dotenv = require( "dotenv" ),
	bcrypt = require( "bcrypt" ),
	User = require( "../../src/models/User" ),
	Notification = require( "../../src/models/Notification" ),
	notifyMentions = require( "../../src/utils/notifyMentions" );

dotenv.config();
mongoose.connect( process.env.MONGODB_URL );

describe( "notifyMentions", function() {
	let
		user1,
		user2,
		mentionsNotifications;

	before( async function() {
		user1 = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "password123", 10 )
		}).save();
		user2 = await new User({
			email: "test2@gmail.com",
			username: "testuser2",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "password123", 10 )
		}).save();
		user3 = await new User({
			email: "test3@gmail.com",
			username: "testuser3",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "password123", 10 )
		}).save();
		user4 = await new User({
			email: "test4@gmail.com",
			username: "testuser4",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "password123", 10 )
		}).save();
	});

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
		await User.remove({ email: "test2@gmail.com" });
		await User.remove({ email: "test3@gmail.com" });
		await User.remove({ email: "test4@gmail.com" });
		await Notification.remove({ receiver: user2._id });
		await Notification.remove({ receiver: user3._id });
		await Notification.remove({ receiver: user4._id });
	});

	it( "expect an array", async function() {
		try {
			mentionsNotifications = await notifyMentions(
				[ "testuser2", "testuser3", "testuser4" ],
				"comment", { _id: "123asd" }, user1 );
		} catch ( err ) {
			console.log( err );
		}
		expect( mentionsNotifications ).to.be.an( "array" );
		expect( mentionsNotifications.length ).to.equal( 3 );
	});

	it( "throws Target user doesn't exist", async function() {
		try {
			expect(
				await notifyMentions([ "nouser" ], "comment", { _id: "123asd" }, user1 )
			).to.throw();
		} catch ( err ) {
		}
	});

	it( "throws Expected user data not found.", async function() {
		try {
			expect(
				await notifyMentions([ "testuser2" ], "comment", { _id: "123asd" }, {})
			).to.throw();
		} catch ( err ) {
		}
	});

	it( "throws Expected object data not found.", async function() {
		try {
			expect(
				await notifyMentions([ "testuser2" ], "comment", {}, user1 )
			).to.throw();
		} catch ( err ) {
		}
	});

	it( "throws No type provided.", async function() {
		try {
			expect(
				await notifyMentions([ "testuser2" ], "", { _id: "123asd" }, user1 )
			).to.throw();
		} catch ( err ) {
		}
	});
});
