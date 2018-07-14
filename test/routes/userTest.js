var token;
const
	chai = require( "chai" ),
	chaiHttp = require( "chai-http" ),
	should = chai.should(),
	request = require( "request" ),
	mongoose = require( "mongoose" ),
	dotenv = require( "dotenv" ),
	bcrypt = require( "bcrypt" ),
	tokenGenerator = require( "../../src/utils/tokenGenerator" ),
	Post = require( "../../src/models/Post" ),
	User = require( "../../src/models/User" );

dotenv.config();
chai.use( chaiHttp );


describe( "POST user/userInfo", function() {
	var
		token,
		author;

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
	});

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			keywords: [ "test" ],
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( author );
	});

	it( "should return 200", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/userInfo" )
			.send({
				token: token,
				username: author.username
			})
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 404 User doesn't exist", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/userInfo" )
			.send({
				token: token,
				username: "unexistinguser"
			})
			.end(( err, res ) => {
				res.should.have.status( 404 );
				res.text.should.equal( "User doesn't exist" );
				done();
			});
	});

	it( "should return 422 Token not found", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/userInfo" )
			.send({
				username: "unexistinguser"
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 Username not found", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/userInfo" )
			.send({
				token: token,
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 invalid jwt", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/userInfo" )
			.send({
				username: "unexistinguser",
				token: "123213asdasd123123123"
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});



describe( "post user/info", function() {
	var
		token,
		author;

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
	});

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			keywords: [ "test" ],
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( author );
	});

	it( "gets the user info, should return 200", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/info" )
			.send({
				token: token,
				userImage: null,
				headerImage: null
			})
			.end(( err, res ) => {
				res.should.have.status( 201 );
				done();
			});
	});

	it( "should return 422 Token not found", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/info" )
			.send({
				userImage: null,
				headerImage: null
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 invalid jwt", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/info" )
			.send({
				token: "123123sadasda1231312",
				userImage: null,
				headerImage: null
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});



describe( "post user/match", function() {
	it( "should return 200", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/match" )
			.send({
				data: [ "Technology", "Art", "Science" ]
			})
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 422", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/match" )
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});
});



describe( "post user/updateInterests", function() {
	var
		token,
		author;

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
	});

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			keywords: [ "test" ],
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( author );
	});

	it( "should return 201", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/updateInterests" )
			.send({
				token: token,
				newInterests: [ "Technology", "Art", "Science" ]
			})
			.end(( err, res ) => {
				res.should.have.status( 201 );
				done();
			});
	});

	it( "should return 422", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/updateInterests" )
			.send({
				token: token
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/updateInterests" )
			.send({
				newInterests: []
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 invalid jwt", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/updateInterests" )
			.send({
				token: "123123sadasda1231312",
				newInterests: [ "Technology", "Art", "Science" ]
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});



describe( "post user/sugestedUsers", function() {
	var
		token,
		author;

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
	});

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			keywords: [ "test" ],
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( author );
	});

	it( "should return 200", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/sugestedUsers" )
			.send({
				token: token,
				skip: 0
			})
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 422", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/sugestedUsers" )
			.send({
				token: token
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/sugestedUsers" )
			.send({
				skip: 0
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 invalid jwt", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/sugestedUsers" )
			.send({
				token: "123123sadasda1231312",
				skip: 0
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});



describe( "post user/randomUser", function() {
	var
		token,
		author;

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

	it( "should return 200", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/randomUser" )
			.send({
				token: token
			})
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 422", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/randomUser" )
			.send({
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 invalid jwt", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/randomUser" )
			.send({
				token: "123123sadasda1231312"
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});



describe( "post user/matchKwUsers", function() {
	var
		token,
		author;

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

	it( "should return 200", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/matchKwUsers" )
			.send({
				token: token,
				skip: 0,
				data: [ "test" ]
			})
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 422", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/matchKwUsers" )
			.send({
				token: token,
				skip: 0
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/matchKwUsers" )
			.send({
				token: token,
				data: []
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/matchKwUsers" )
			.send({
				data: [],
				skip: 0
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 invalid jwt", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/matchKwUsers" )
			.send({
				token: "123123sadasda1231312",
				data: [],
				skip: 0
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});



describe( "post user/setUserKw", function() {
	var
		token,
		author;

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
	});

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			keywords: [ "test" ],
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( author );
	});

	it( "should return 201", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/setUserKw" )
			.send({
				token: token,
				data: [ "test" ]
			})
			.end(( err, res ) => {
				res.should.have.status( 201 );
				done();
			});
	});

	it( "should return 422", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/setUserKw" )
			.send({
				token: token
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/setUserKw" )
			.send({
				data: []
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 invalid jwt", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/setUserKw" )
			.send({
				token: "123123sadasda1231312",
				data: []
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});



describe( "post user/getChats", function() {
	var
		token,
		author;

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
	});

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			keywords: [ "test" ],
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( author );
	});

	it( "should return 200", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/getChats" )
			.send({ token: token })
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 422", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/getChats" )
			.send({})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 invalid jwt", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/getChats" )
			.send({ token: "123123sadasda1231312" })
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});



describe( "post user/getSocialCircle", function() {
	var
		token,
		author;

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
	});

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			keywords: [ "test" ],
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( author );
	});

	it( "should return 200", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/getSocialCircle" )
			.send({ token: token })
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 422", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/getSocialCircle" )
			.send({})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 invalid jwt", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/getSocialCircle" )
			.send({ token: "123123sadasda1231312" })
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});
