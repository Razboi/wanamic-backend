const
	chai = require( "chai" ),
	chaiHttp = require( "chai-http" ),
	should = chai.should(),
	request = require( "request" ),
	mongoose = require( "mongoose" ),
	dotenv = require( "dotenv" ).config(),
	bcrypt = require( "bcrypt" ),
	tokenGenerator = require( "../../src/utils/tokenGenerator" ),
	refreshTokenGenerator = require( "../../src/utils/refreshTokenGenerator" ),
	User = require( "../../src/models/User" );

chai.use( chaiHttp );
mongoose.connect( process.env.DEV_MONGODB_URL, { useNewUrlParser: true }).then(() => {
	console.log( "MongoDB connected" );
}).catch( err => console.log( err ));

describe( "auth/signup", function() {

	before( async function() {
		author = await new User({
			email: "test2@gmail.com",
			username: "testuser2",
			fullname: "Test User",
			keywords: [ "test" ],
			passwordHash: bcrypt.hashSync( "password123", 10 )
		}).save();
		token = await tokenGenerator( author );
	});

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
		await User.remove({ email: "test2@gmail.com" });
	});

	it( "should return 201", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/auth/signup" )
			.send({
				credentials: {
					email: "test@gmail.com",
					username: "signuptestuser",
					fullname: "Test User",
					password: "password123"
				}
			})
			.end(( err, res ) => {
				res.should.have.status( 201 );
				res.text.should.be.a( "string" );
				done();
			});
	});

	it( "should return 422 for blank credentials", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/auth/signup" )
			.send({
				credentials: {
					email: "test@gmail.com",
					password: ""
				}
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 for already registered email", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/auth/signup" )
			.send({
				credentials: {
					email: "test2@gmail.com",
					username: "newtestuser",
					fullname: "Test User",
					password: "password123"
				}
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Email already registered" );
				done();
			});
	});

	it( "should return 422 for already registered username", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/auth/signup" )
			.send({
				credentials: {
					email: "test2@gmail.com",
					username: "testuser2",
					fullname: "Test User",
					password: "password123"
				}
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Username already registered" );
				done();
			});
	});
});



describe( "auth/login", function() {
	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
	});

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
	});

	it( "should return 200", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/auth/login" )
			.send({
				credentials: {
					email: "test@gmail.com",
					password: "test"
				}
			})
			.end(( err, res ) => {
				res.should.have.status( 200 );
				res.text.should.be.a( "string" );
				done();
			});
	});

	it( "should return 422 for blank credentials", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/auth/login" )
			.send({
				credentials: {
					email: "test@gmail.com",
					password: ""
				}
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 for blank credentials", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/auth/login" )
			.send({
				credentials: {
					email: "",
					password: "123"
				}
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 404 for invalid email", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/auth/login" )
			.send({
				credentials: {
					email: "nonexisting@gmail.com",
					password: "test"
				}
			})
			.end(( err, res ) => {
				res.should.have.status( 404 );
				res.text.should.equal( "Email is not registered" );
				done();
			});
	});

	it( "should return 401 for invalid password", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/auth/login" )
			.send({
				credentials: {
					email: "test@gmail.com",
					password: "invalid"
				}
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "Invalid password" );
				done();
			});
	});
});


describe( "auth/verify", function() {
	var
		author,
		token;

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
	});

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = tokenGenerator( author );
	});

	it( "should return 200", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/auth/verify" )
			.send({ token: token })
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 422", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/auth/verify" )
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 malformed jwt", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/auth/verify" )
			.send({ token: "123213adasdsad21321321" })
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});


describe( "auth/token", function() {
	var
		author,
		refreshToken;

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
	});

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		try {
			refreshToken = await refreshTokenGenerator( author );
		} catch ( err ) {
			console.log( err );
		}
	});

	it( "should return 201", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/auth/token" )
			.send({ refreshToken: refreshToken })
			.end(( err, res ) => {
				res.should.have.status( 201 );
				done();
			});
	});

	it( "should return 422", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/auth/token" )
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 500 jwt malformed", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/auth/token" )
			.send({ refreshToken: "123213adasdsad21321321" })
			.end(( err, res ) => {
				res.should.have.status( 500 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});


describe( "auth/refreshToken", function() {
	var
		author,
		token;

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
	});

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( author );
	});

	it( "should return 201", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/auth/refreshToken" )
			.send({ token: token })
			.end(( err, res ) => {
				res.should.have.status( 201 );
				done();
			});
	});

	it( "should return 422", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/auth/refreshToken" )
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 malformed jwt", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/auth/refreshToken" )
			.send({ token: "123213adasdsad21321321" })
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});
