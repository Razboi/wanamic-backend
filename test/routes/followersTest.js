const
	chai = require( "chai" ),
	chaiHttp = require( "chai-http" ),
	should = chai.should(),
	expect = chai.expect,
	request = require( "request" ),
	mongoose = require( "mongoose" ),
	dotenv = require( "dotenv" ),
	bcrypt = require( "bcrypt" ),
	tokenGenerator = require( "../../src/utils/tokenGenerator" ),
	Notification = require( "../../src/models/Notification" ),
	User = require( "../../src/models/User" );

dotenv.config();
chai.use( chaiHttp );
mongoose.connect( process.env.MONGODB_URL );

describe( "POST followers/follow", function() {
	var
		author,
		receiver,
		token;

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
		await User.remove({ email: "test2@gmail.com" });
		await Notification.remove({ author: author._id });
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

	it( "adds a new follower/following", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/followers/follow" )
			.send({
				token: token,
				targetUsername: receiver.username
			})
			.end(( err, res ) => {
				res.should.have.status( 201 );
				done();
			});
	});

	it( "should return 404 User doesn't exist", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/followers/follow" )
			.send({
				token: token,
				targetUsername: "nonexistinguser"
			})
			.end(( err, res ) => {
				res.should.have.status( 404 );
				res.text.should.equal( "User doesn't exist" );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/followers/follow" )
			.send({
				token: token
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/followers/follow" )
			.send({
				targetUsername: receiver.username
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 malformed jwt", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/followers/follow" )
			.send({
				token: "123213adasdsad21321321",
				targetUsername: receiver.username
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});



describe( "DELETE followers/unfollow", function() {
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

	it( "deletes a friend, should return 200", function( done ) {
		chai.request( "localhost:8000" )
			.delete( "/followers/unfollow" )
			.send({
				token: token,
				targetUsername: receiver.username
			})
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.delete( "/followers/unfollow" )
			.send({
				token: token
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.delete( "/followers/unfollow" )
			.send({
				targetUsername: receiver.username
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 404 User doesn't exist", function( done ) {
		chai.request( "localhost:8000" )
			.delete( "/followers/unfollow" )
			.send({
				token: token,
				targetUsername: "inexistentuser"
			})
			.end(( err, res ) => {
				res.should.have.status( 404 );
				res.text.should.equal( "User doesn't exist" );
				done();
			});
	});

	it( "should return 401 malformed jwt", function( done ) {
		chai.request( "localhost:8000" )
			.delete( "/followers/unfollow" )
			.send({
				token: "123213adasdsad21321321",
				targetUsername: receiver.username
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});



describe( "POST followers/setupFollow", function() {
	var
		author,
		receiver,
		token;

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
		await User.remove({ email: "test2@gmail.com" });
		await Notification.remove({ author: author._id });
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

	it( "setup following, should return 201", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/followers/setupFollow" )
			.send({
				token: token,
				users: [
					receiver.username, author.username
				]
			})
			.end(( err, res ) => {
				res.should.have.status( 201 );
				expect( res.body ).to.be.an( "array" );
				expect( res.body.length ).to.equal( 2 );
				done();
			});
	});

	it( "should return 404 User doesn't exist", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/followers/setupFollow" )
			.send({
				token: token,
				users: [ "nonexistinguser321" ]
			})
			.end(( err, res ) => {
				res.should.have.status( 404 );
				res.text.should.equal( "User doesn't exist" );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/followers/setupFollow" )
			.send({
				token: token
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/followers/setupFollow" )
			.send({
				users: [ receiver.username, author.username ]
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 malformed jwt", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/followers/setupFollow" )
			.send({
				token: "123213adasdsad21321321",
				users: [ receiver.username, author.username ]
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});
