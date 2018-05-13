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
		username: "testuser",
		fullname: "Test User",
		passwordHash: bcrypt.hashSync( "test", 10 )
	})
		.save()
		.then(() => {
			new User({
				email: "test2@gmail.com",
				username: "testuser2",
				fullname: "Test User2",
				passwordHash: bcrypt.hashSync( "test", 10 )
			})
				.save()
				.then(() => done())
				.catch( err => done( err ));
		}).catch( err => done( err ));
});


// POST
describe( "POST followers/follow", function() {
	var token;

	before( function( done ) {
		User.findOne({ email: "test@gmail.com" })
			.exec()
			.then( user => {
				token = tokenGenerator( user );
				done();
			}).catch( err => done( err ));
	});

	after( function( done ) {
		Notification.findOne({
			author: "signuptestuser",
			receiver: "testuser2",
			follow: true
		})
			.exec()
			.then( notification => {
				notification.remove();
				done();
			}).catch( err => done( err ));
	});

	it( "adds a new user to following array, should return 201", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/followers/follow" )
			.send({
				token: token,
				targetUsername: "testuser2"
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
				targetUsername: "testuser2"
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
				targetUsername: "testuser2"
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});


// DELETE
describe( "DELETE followers/unfollow", function() {
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
			.delete( "/followers/unfollow" )
			.send({
				token: token,
				targetUsername: "testuser2"
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
				targetUsername: "testuser2"
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
				targetUsername: "test2@gmail.com"
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});


// POST
describe( "POST followers/setupFollow", function() {
	var token;

	before( function( done ) {
		User.findOne({ email: "test@gmail.com" })
			.exec()
			.then( user => {
				token = tokenGenerator( user );
				done();
			}).catch( err => done( err ));
	});

	it( "adds a list of users to following, should return 201", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/followers/setupFollow" )
			.send({
				token: token,
				users: [ "testuser2", "testuser" ]
			})
			.end(( err, res ) => {
				res.should.have.status( 201 );
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
				users: [ "testuser2", "testuser" ]
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
				users: [ "testuser2", "testuser" ]
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});
