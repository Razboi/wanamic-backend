const
	chai = require( "chai" ),
	chaiHttp = require( "chai-http" ),
	should = chai.should(),
	request = require( "request" ),
	mongoose = require( "mongoose" ),
	dotenv = require( "dotenv" ),
	bcrypt = require( "bcrypt" ),
	tokenGenerator = require( "../../src/utils/tokenGenerator" ),
	Conversation = require( "../../src/models/Conversation" ),
	Message = require( "../../src/models/Message" ),
	User = require( "../../src/models/User" );

dotenv.config();
chai.use( chaiHttp );

describe( "POST conversations/add", function() {
	var
		user,
		token;
	after( async function() {
		await User.remove({ email: "test@gmail.com" });
		await Conversation.remove({ author: user._id });
		await Conversation.remove({ target: user._id });
		await Message.remove({ receiver: user._id });
	});

	before( async function() {
		user = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( user );
	});

	it( "adds a conversation, should return 200", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/conversations/add" )
			.send({
				token: token,
				friendUsername: user.username,
				content: "sup"
			})
			.end(( err, res ) => {
				res.should.have.status( 201 );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/conversations/add" )
			.send({
				token: token,
				friendUsername: "testuser"
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/conversations/add" )
			.send({
				friendUsername: "testuser",
				content: "sup"
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/conversations/add" )
			.send({
				token: token,
				content: "sup"
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 malformed jwt", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/conversations/add" )
			.send({
				token: "123213adasdsad21321321",
				friendUsername: "testuser",
				content: "sup"
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});
