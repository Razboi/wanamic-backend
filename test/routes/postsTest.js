const
	chai = require( "chai" ),
	chaiHttp = require( "chai-http" ),
	should = chai.should(),
	request = require( "request" ),
	mongoose = require( "mongoose" ),
	dotenv = require( "dotenv" ),
	tokenGenerator = require( "../../src/utils/tokenGenerator" ),
	User = require( "../../src/models/User" );

dotenv.config();
chai.use( chaiHttp );


describe( "posts/create", function() {
	var token;
	before( function( done ) {
		mongoose.connect( process.env.MONGODB_URL );
		User.findOne({ email: "test@gmail.com" })
			.then( user => {
				token = tokenGenerator( user );
				done();
			}).catch( err => console.log( err ));
	});

	it( "creates a new post, should return 201", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/create" )
			.send({
				post: { token: token, content: "test2" }
			})
			.end(( err, res ) => {
				res.should.have.status( 201 );
				done();
			});
	});

	it( "should return 422 for empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/create" )
			.send({
				post: {}
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				done();
			});
	});

	it( "should return 401 for invalid token", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/create" )
			.send({
				post: { token: "1232312sadasd213213", content: "test2" }
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				done();
			});
	});
});
