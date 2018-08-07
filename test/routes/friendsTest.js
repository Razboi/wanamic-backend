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
mongoose.connect( process.env.MONGODB_URL );

describe( "POST friends/add", function() {
	var
		author,
		target,
		token;

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
		await User.remove({ email: "test2@gmail.com" });
		await Notification.remove({
			author: author._id, friendRequest: true
		});
	});

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( author );
		target = await new User({
			email: "test2@gmail.com",
			username: "testuser2",
			fullname: "Test User2",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
	});

	it( "adds a new friend, should return 201", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/friends/add" )
			.send({
				token: token,
				friendUsername: target.username
			})
			.end(( err, res ) => {
				res.should.have.status( 201 );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/friends/add" )
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
			.post( "/friends/add" )
			.send({
				friendUsername: target.username
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 malformed jwt", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/friends/add" )
			.send({
				token: "123213adasdsad21321321",
				friendUsername: target.username
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});

	it( "should return 404 User doesn't exist", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/friends/add" )
			.send({
				token: token,
				friendUsername: "inexistingusername"
			})
			.end(( err, res ) => {
				res.should.have.status( 404 );
				res.text.should.equal( "User doesn't exist" );
				done();
			});
	});
});



describe( "DELETE friends/delete", function() {
	var
		author,
		target,
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
		target = await new User({
			email: "test2@gmail.com",
			username: "testuser2",
			fullname: "Test User2",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
	});

	it( "deletes a friend, should return 200", function( done ) {
		chai.request( "localhost:8000" )
			.delete( "/friends/delete" )
			.send({
				token: token,
				friendUsername: target.username
			})
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.delete( "/friends/delete" )
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
			.delete( "/friends/delete" )
			.send({
				friendUsername: target.username
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 malformed jwt", function( done ) {
		chai.request( "localhost:8000" )
			.delete( "/friends/delete" )
			.send({
				token: "123213adasdsad21321321",
				friendUsername: target.username
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});

	it( "should return 404 User doesn't exist", function( done ) {
		chai.request( "localhost:8000" )
			.delete( "/friends/delete" )
			.send({
				token: token,
				friendUsername: "inexistingusername"
			})
			.end(( err, res ) => {
				res.should.have.status( 404 );
				res.text.should.equal( "User doesn't exist" );
				done();
			});
	});
});



describe( "POST friends/isRequested", function() {
	var
		author,
		target,
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
		target = await new User({
			email: "test2@gmail.com",
			username: "testuser2",
			fullname: "Test User2",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
	});

	it( "should return 200", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/friends/isRequested" )
			.send({
				token: token,
				targetUsername: target.username
			})
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/friends/isRequested" )
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
			.post( "/friends/isRequested" )
			.send({
				targetUsername: target.username
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 malformed jwt", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/friends/isRequested" )
			.send({
				token: "123213adasdsad21321321",
				targetUsername: target.username
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});

	it( "should return 404 User doesn't exist", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/friends/isRequested" )
			.send({
				token: token,
				targetUsername: "inexistingusername"
			})
			.end(( err, res ) => {
				res.should.have.status( 404 );
				res.text.should.equal( "User doesn't exist" );
				done();
			});
	});
});



describe( "POST friends/accept", function() {
	var
		author,
		target,
		token,
		notification;

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
		target = await new User({
			email: "test2@gmail.com",
			username: "testuser23",
			fullname: "Test User2",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		notification = await new Notification({
			receiver: author._id,
			author: target._id,
			friendRequest: true
		}).save();
	});

	it( "should return 201", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/friends/accept" )
			.send({
				token: token,
				friendUsername: target.username
			})
			.end(( err, res ) => {
				res.should.have.status( 201 );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/friends/accept" )
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
			.post( "/friends/accept" )
			.send({
				friendUsername: target.username
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 malformed jwt", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/friends/accept" )
			.send({
				token: "123213adasdsad21321321",
				friendUsername: target.username
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});

	it( "should return 404 User doesn't exist", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/friends/accept" )
			.send({
				token: token,
				friendUsername: "inexistingusername"
			})
			.end(( err, res ) => {
				res.should.have.status( 404 );
				res.text.should.equal( "User doesn't exist" );
				done();
			});
	});
});
