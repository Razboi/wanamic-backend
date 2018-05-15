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
mongoose.connect( process.env.MONGODB_URL );


// after running tests delete the testing posts
after( function( done ) {
	User.remove({ email: "usertest@gmail.com" })
		.then(() => done())
		.catch( err => done( err ));
});

before( function( done ) {
	new User({
		email: "usertest@gmail.com",
		username: "testuser",
		fullname: "Test User",
		passwordHash: bcrypt.hashSync( "test", 10 )
	})
		.save()
		.then( user => {
			token = tokenGenerator( user );
			done();
		})
		.catch( err => done( err ));
});


// GET :username
describe( "GET user/:username info", function() {

	it( "should return 200", function( done ) {
		chai.request( "localhost:8000" )
			.get( "/user/testuser" )
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 404 User doesn't exist", function( done ) {
		chai.request( "localhost:8000" )
			.get( "/user/nonexistinguser" )
			.end(( err, res ) => {
				res.should.have.status( 404 );
				res.text.should.equal( "User doesn't exist" );
				done();
			});
	});

	it( "should return 404 User doesn't exist", function( done ) {
		chai.request( "localhost:8000" )
			.get( "/user/ " )
			.end(( err, res ) => {
				res.should.have.status( 404 );
				done();
			});
	});
});


// POST info
describe( "post user/info", function() {

	it( "should return 200", function( done ) {
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


// POST match
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


// POST addInterests
describe( "post user/addInterests", function() {

	it( "should return 201", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/addInterests" )
			.send({
				token: token,
				data: [ "Technology", "Art", "Science" ]
			})
			.end(( err, res ) => {
				res.should.have.status( 201 );
				done();
			});
	});

	it( "should return 422", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/addInterests" )
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
			.post( "/user/addInterests" )
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
			.post( "/user/addInterests" )
			.send({
				token: "123123sadasda1231312",
				data: [ "Technology", "Art", "Science" ]
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});


// POST sugestedUsers
describe( "post user/sugestedUsers", function() {

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


// POST randomUser
describe( "post user/randomUser", function() {

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


// POST matchKwUsers
describe( "post user/matchKwUsers", function() {

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


// POST setUserKw
describe( "post user/setUserKw", function() {

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
