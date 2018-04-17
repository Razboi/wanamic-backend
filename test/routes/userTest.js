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
				res.text.should.equal( "[]" );
				done();
			});
	});

	it( "should return 422", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/user/match" )
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Empty data" );
				done();
			});
	});
});


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
				res.text.should.equal( "Empty data" );
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
				res.text.should.equal( "Empty data" );
				done();
			});
	});
});
