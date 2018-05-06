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
	User.remove({ email: "test@gmail.com" })
		.then(() => {
			Post.remove({ author: "signuptestuser" })
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
		.then(() => done())
		.catch( err => done( err ));
});


describe( "POST posts/explore/:skip", function() {
	var token;

	// before running tests create a token
	before( function( done ) {
		User.findOne({ email: "test@gmail.com" })
			.exec()
			.then( user => {
				token = tokenGenerator( user );
				done();
			}).catch( err => done( err ));
	});

	it( "gets explore posts, should return 200", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/explore/0" )
			.send({ token: token })
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 422 for empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/explore/0" )
			.send({})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 404 for invalid route", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/explore/" )
			.send({})
			.end(( err, res ) => {
				res.should.have.status( 404 );
				done();
			});
	});

	it( "should return 401 for invalid token", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/explore/0" )
			.send({ token: "1232312sadasd213213" })
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});


describe( "POST posts/create", function() {
	var token;

	// before running tests create a token
	before( function( done ) {
		User.findOne({ email: "test@gmail.com" })
			.exec()
			.then( user => {
				token = tokenGenerator( user );
				done();
			}).catch( err => done( err ));
	});

	after( function( done ) {
		Post.remove({ author: "testuser" })
			.then(() => done())
			.catch( err => done( err ));
	});

	it( "creates a new post, should return 201", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/create" )
			.send({
				token: token, post: "test2"
			})
			.end(( err, res ) => {
				res.should.have.status( 201 );
				done();
			});
	});

	it( "should return 422 for empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/create" )
			.send({})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 for invalid token", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/create" )
			.send({
				token: "1232312sadasd213213", post: "test2"
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});


describe( "POST posts/media", function() {
	var token;

	// before running tests create a token
	before( function( done ) {
		User.findOne({ email: "test@gmail.com" })
			.exec()
			.then( user => {
				token = tokenGenerator( user );
				done();
			}).catch( err => done( err ));
	});

	after( function( done ) {
		Post.remove({ author: "testuser" })
			.then(() => done())
			.catch( err => done( err ));
	});

	it( "creates a new post, should return 201", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/media" )
			.send({
				token: token, data: { privacyRange: 1, alerts: {} }
			})
			.end(( err, res ) => {
				res.should.have.status( 201 );
				done();
			});
	});

	it( "should return 422 for empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/media" )
			.send({
				token: token
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 for empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/media" )
			.send({
				data: {}
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 for invalid token", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/media" )
			.send({
				token: "1232312sadasd213213", data: { privacyRange: 1, alerts: {} }
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});

describe( "POST posts/mediaLink", function() {
	var token;

	// before running tests create a token
	before( function( done ) {
		User.findOne({ email: "test@gmail.com" })
			.exec()
			.then( user => {
				token = tokenGenerator( user );
				done();
			}).catch( err => done( err ));
	});

	after( function( done ) {
		Post.remove({ author: "testuser" })
			.then(() => done())
			.catch( err => done( err ));
	});

	it( "creates a new post, should return 201", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/mediaLink" )
			.send({
				token: token, data: { link: "https://www.youtube.com/watch?v=B58OBfM-8A4" }
			})
			.end(( err, res ) => {
				res.should.have.status( 201 );
				done();
			});
	});

	it( "should return 422 for empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/mediaLink" )
			.send({
				token: token
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 for empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/mediaLink" )
			.send({
				data: { link: "https://www.youtube.com/watch?v=B58OBfM-8A4" }
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 for invalid token", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/mediaLink" )
			.send({
				token: "1232312sadasd213213", data: { link: "https://www.youtube.com/watch?v=B58OBfM-8A4" }
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});


describe( "POST posts/mediaPicture", function() {
	var
		token;

	// before running tests create a token
	before( function( done ) {
		User.findOne({ email: "test@gmail.com" })
			.exec()
			.then( user => {
				token = tokenGenerator( user );
				done();
			}).catch( err => done( err ));
	});

	after( function( done ) {
		Post.remove({ author: "testuser" })
			.then(() => done())
			.catch( err => done( err ));
	});

	it( "should return 422 for empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/mediaPicture" )
			.send({
				picture: [ "123" ]
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 for empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/mediaPicture" )
			.send({
				token: "123asdad123123"
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});
});


describe( "GET posts/:username/:skip", function() {
	var
		token;

	before( function( done ) {
		User.findOne({ email: "test@gmail.com" })
			.exec()
			.then( user => {
				token = tokenGenerator( user );
				done();
			}).catch( err => done( err ));
	});

	it( "should get the user  posts", function( done ) {
		chai.request( "localhost:8000" )
			.get( "/posts/testuser/0" )
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});
});



describe( "GET posts/newsfeed/:skip", function() {
	var
		token;

	before( function( done ) {
		User.findOne({ email: "test@gmail.com" })
			.exec()
			.then( user => {
				token = tokenGenerator( user );
				done();
			}).catch( err => done( err ));
	});

	it( "should get the user newsfeed", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/newsfeed/0" )
			.send({
				token: token
			})
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 422 Missing token", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/newsfeed/0" )
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 Missing token", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/newsfeed/0" )
			.send({
				token: "123123asdasd123123"
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});



describe( "DELETE posts/delete", function() {
	var
		token,
		invalidToken,
		postId;

	before( function( done ) {
		User.findOne({ email: "test@gmail.com" })
			.exec()
			.then( user => {
				token = tokenGenerator( user );
				new Post({
					author: user.username,
					content: "Delete me"
				})
					.save()
					.then( post => {
						postId = post.id;
						done();
					}).catch( err => done( err ));
			}).catch( err => done( err ));
	});

	it( "should return 422 Empty post data", function( done ) {
		chai.request( "localhost:8000" )
			.delete( "/posts/delete" )
			.send({
				post: {}
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 Empty post data", function( done ) {
		chai.request( "localhost:8000" )
			.delete( "/posts/delete" )
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401", function( done ) {
		chai.request( "localhost:8000" )
			.delete( "/posts/delete" )
			.send({
				post: { id: postId, token: "123123" }
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});

	it( "should return 500 for invalid objectId", function( done ) {
		chai.request( "localhost:8000" )
			.delete( "/posts/delete" )
			.send({
				post: { id: "123321", token: token }
			})
			.end(( err, res ) => {
				res.should.have.status( 500 );
				done();
			});
	});

	before( function( done ) {
		User.findOne({ email: "test2@gmail.com" })
			.exec()
			.then( user => {
				if ( !user ) {
					chai.request( "localhost:8000" )
						.post( "/auth/signup" )
						.send({
							credentials: {
								email: "test2@gmail.com",
								username: "testuser2",
								fullname: "Test User2",
								password: "test"
							}
						})
						.end(( err, res ) => {
							invalidToken = res.text;
							done();
						});
				} else {
					invalidToken = tokenGenerator( user );
					done();
				}
			}).catch( err => done( err ));
	});

	it( "should return 401 Requester isn't the author", function( done ) {
		chai.request( "localhost:8000" )
			.delete( "/posts/delete" )
			.send({
				post: { id: postId, token: invalidToken }
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "Unauthorized" );
				done();
			});
	});

	it( "should return 200", function( done ) {
		chai.request( "localhost:8000" )
			.delete( "/posts/delete" )
			.send({
				post: { id: postId, token: token }
			})
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});
});



describe( "PATCH posts/update", function() {
	var
		token,
		invalidToken,
		postId;

	// before updating a post we need to create the post and get the user token and postId
	before( function( done ) {
		User.findOne({ email: "test@gmail.com" })
			.exec()
			.then( user => {
				token = tokenGenerator( user );
				new Post({
					author: user.username,
					content: "update test"
				}).save()
					.then( post => {
						postId = post.id;
						done();
					}).catch( err => done( err ));
			}).catch( err => done( err ));
	});

	it( "should return 200 and update the post", function( done ) {
		chai.request( "localhost:8000" )
			.patch( "/posts/update" )
			.send({
				data: {
					token: token,
					post: { id: postId, content: "Updated content :)" }
				}
			})
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.patch( "/posts/update" )
			.send({
				data: {
					token: token,
					post: {}
				}
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 jwt malformed", function( done ) {
		chai.request( "localhost:8000" )
			.patch( "/posts/update" )
			.send({
				data: {
					token: "12312asdas123123",
					post: { id: postId, content: "Should not update" }
				}
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});

	// before testing get the invalid userToken. If the user doesn't exists create it
	before( function( done ) {
		User.findOne({ email: "test2@gmail.com" })
			.exec()
			.then( user => {
				if ( !user ) {
					chai.request( "localhost:8000" )
						.post( "/auth/signup" )
						.send({
							credentials: {
								email: "test2@gmail.com",
								username: "testuser2",
								fullname: "Test User2",
								password: "test"
							}
						})
						.end(( err, res ) => {
							invalidToken = res.text;
							done();
						});
				} else {
					invalidToken = tokenGenerator( user );
					done();
				}
			}).catch( err => done( err ));
	});

	it( "should return 401 Requester isn't the author", function( done ) {
		chai.request( "localhost:8000" )
			.patch( "/posts/update" )
			.send({
				data: {
					token: invalidToken,
					post: { id: postId, content: "Should not update" }
				}
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "Unauthorized" );
				done();
			});
	});

	after( function( done ) {
		Post.remove({ _id: postId })
			.exec()
			.then(() => done())
			.catch( err => done( err ));
	});
});


describe( "POST posts/share", function() {
	var
		token,
		postId;

	// before updating a post we need to create the post and get the user token and postId
	before( function( done ) {
		User.findOne({ email: "test@gmail.com" })
			.exec()
			.then( user => {
				token = tokenGenerator( user );
				new Post({
					author: user.username,
					content: "test"
				}).save()
					.then( post => {
						postId = post.id;
						done();
					}).catch( err => done( err ));
			}).catch( err => done( err ));
	});

	it( "should return 200 and share the post", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/share" )
			.send({
				token: token,
				postId: postId
			})
			.end(( err, res ) => {
				res.should.have.status( 201 );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/share" )
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
			.post( "/posts/share" )
			.send({
				postId: postId
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 malformed jwt", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/share" )
			.send({
				token: "123213adasdsad21321321",
				postId: postId
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});

	after( function( done ) {
		Post.remove({ _id: postId })
			.exec()
			.then(() => done())
			.catch( err => done( err ));
	});
});
