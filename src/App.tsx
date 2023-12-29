import { Container, Row } from 'react-bootstrap'
import './App.scss'
function App() {
  return (
    <>
      <Container className="text-center">
        <form action='submit'>
          <div className='row justify-content-center'>
            <div className='col-sm-4'>
              <label htmlFor='first_name'>First Name:</label>
              <input
                id='first_name'
                type='text'
              />
            </div>
          </div>

          <div className='row justify-content-center'>
            <div className='col-sm-4'>
              <label htmlFor='last_name'>Last Name:</label>
              <input
                id='last_name'
                type='text'
              />
            </div>
          </div>
          <div className='row justify-content-center'>
            <div className='col-sm-4'>
              <label htmlFor='email'>Email:</label>
              <input
                id='email'
                type='text'
              />
            </div>
          </div>
          <div className='row justify-content-center'>
            <div className='col-sm-4'>
              <label htmlFor='phone_no'>Phone Number:</label>
              <input
                id='phone_no'
                type='text'
              />
            </div>
          </div>
          <div className='row justify-content-center'>
            <div className='col-sm-4'>
              <button
                className='btn btn-primary'
                type='submit'>
                Pay
              </button>
            </div>
          </div>
          <div className='row justify-content-center'>
            <div className='col-sm-4'></div>
          </div>
        </form>
      </Container>
      <Row></Row>
    </>
  )
}

export default App
