const
	chai = require( "chai" ),
	chaiHttp = require( "chai-http" ),
	should = chai.should(),
	request = require( "request" ),
	mongoose = require( "mongoose" ),
	dotenv = require( "dotenv" ),
	bcrypt = require( "bcrypt" ),
	tokenGenerator = require( "../../src/utils/tokenGenerator" ),
	User = require( "../../src/models/User" );

dotenv.config();
chai.use( chaiHttp );
mongoose.connect( process.env.MONGODB_URL );


after( function( done ) {
	User.remove({ email: "test@gmail.com" })
		.then(() => {
			User.remove({ email: "test2@gmail.com" })
				.then(() => done())
				.catch( err => done( err ));
		}).catch( err => done( err ));
});

before( function( done ) {
	new User({
		email: "test@gmail.com",
		passwordHash: bcrypt.hashSync( "test", 10 )
	})
		.save()
		.then(() => {
			new User({
				email: "test2@gmail.com",
				passwordHash: bcrypt.hashSync( "test", 10 )
			})
				.save()
				.then(() => done())
				.catch( err => done( err ));
		}).catch( err => done( err ));
});


// POST
describe( "POST friends/add", function() {
	var token;

	before( function( done ) {
		User.findOne({ email: "test@gmail.com" })
			.exec()
			.then( user => {
				token = tokenGenerator( user );
				done();
			}).catch( err => done( err ));
	});

	it( "adds a new friend, should return 201", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/friends/add" )
			.send({
				token: token,
				friendUsername: "test2@gmail.com"
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
				res.text.should.equal( "Empty data" );
				done();
			});
	});

	it( "should return 401 malformed jwt", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/friends/add" )
			.send({
				token: "123213adasdsad21321321",
				friendUsername: "test2@gmail.com"
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});


// DELETE
describe( "DELETE friends/delete", function() {
	var token;

	before( function( done ) {
		User.findOne({ email: "test@gmail.com" })
			.exec()
			.then( user => {
				token = tokenGenerator( user );
				done();
			}).catch( err => done( err ));
	});

	it( "deletes a friend, should return 200", function( done ) {
		chai.request( "localhost:8000" )
			.delete( "/friends/delete" )
			.send({
				token: token,
				friendUsername: "test2@gmail.com"
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
				res.text.should.equal( "Empty data" );
				done();
			});
	});

	it( "should return 401 malformed jwt", function( done ) {
		chai.request( "localhost:8000" )
			.delete( "/friends/delete" )
			.send({
				token: "123213adasdsad21321321",
				friendUsername: "test2@gmail.com"
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});
