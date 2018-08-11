const
	chai = require( "chai" ),
	chaiHttp = require( "chai-http" ),
	should = chai.should(),
	request = require( "request" ),
	mongoose = require( "mongoose" ),
	dotenv = require( "dotenv" ),
	bcrypt = require( "bcrypt" ),
	tokenGenerator = require( "../../src/utils/tokenGenerator" ),
	Notification = require( "../../src/models/Notification" ),
	User = require( "../../src/models/User" );

dotenv.config();
chai.use( chaiHttp );
mongoose.connect( process.env.DEV_MONGODB_URL, { useNewUrlParser: true }).then(() => {
	console.log( "MongoDB connected" );
}).catch( err => console.log( err ));

describe( "POST notifications/retrieve/:skip", function() {
	var
		author,
		receiver,
		token;

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
		await User.remove({ email: "test2@gmail.com" });
	});

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( author );
		receiver = await new User({
			email: "test2@gmail.com",
			username: "testuser2",
			fullname: "Test User2",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
	});

	it( "returns notifications, should return 200", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/notifications/retrieve/0" )
			.send({
				token: token
			})
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/notifications/retrieve/0" )
			.send({})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 malformed jwt", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/notifications/retrieve/0" )
			.send({
				token: "123213adasdsad21321321"
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});


describe( "POST notifications/check", function() {
	var
		notification,
		author,
		receiver,
		token;

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
		await User.remove({ email: "test2@gmail.com" });
		await Notification.remove({ receiver: author._id });
	});

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( author );
		receiver = await new User({
			email: "test2@gmail.com",
			username: "testuser2",
			fullname: "Test User2",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		notification = await new Notification({
			receiver: author._id,
			author: receiver._id
		}).save();
	});

	it( "returns notifications, should return 200", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/notifications/check" )
			.send({
				token: token
			})
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/notifications/check" )
			.send({})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 malformed jwt", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/notifications/check" )
			.send({
				token: "123213adasdsad21321321",
				notificationId: notification._id
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});
