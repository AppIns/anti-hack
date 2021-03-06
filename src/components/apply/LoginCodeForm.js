import React, { Component } from 'react'
import { api } from 'data.json'
import { Label, Input, Text, cx } from '@hackclub/design-system'
import { withFormik } from 'formik'
import yup from 'yup'
import fetch from 'unfetch'

const StyledInput = Input.extend`
  text-align: inherit;
  background: ${props => props.color};
  color: ${props => cx(props.bg)};
  border: none;
  :focus {
    box-shadow: none !important;
  }
  ::placeholder {
    text-align: inherit;
    color: ${props => cx(props.bg)};
    opacity: 0.5;
  }
`

class InnerForm extends Component {
  constructor(props) {
    super(props)
    this.state = { previousLength: 0 }
  }

  formatAsLoginCode(event, rawInput) {
    const typedDash = rawInput.slice(rawInput.length - 2) == '--'
    let digits = rawInput.replace(/[^0-9]/g, '')
    const isRemovingDash =
      this.state.previousLength === 3 && digits.length === 3 && !typedDash

    // remove the last digit with the trailing dash
    if (isRemovingDash) {
      digits = digits.slice(0, -1)
    }

    let result = ''
    result += digits.substring(0, 3) // the first 3 digits
    if (digits.length >= 3) {
      result += '-'
    }
    result += digits.substring(3, 6) // the next 3 digits

    this.setState({ previousLength: digits.length })

    return result
  }

  render() {
    const {
      values,
      errors,
      touched,
      handleChange,
      handleBlur,
      handleSubmit,
      isSubmitting,
      status,
      color,
      bg,
      email,
      inputProps = {},
      textProps = {}
    } = this.props
    return (
      <form onSubmit={handleSubmit}>
        <Label className="loginCode" id="loginCode" {...textProps}>
          <Text color={color} mb={3}>
            Rad! We just sent a login code to {email}. 📬
          </Text>
          <StyledInput
            name="loginCode"
            color={color}
            bg={bg}
            placeholder="Login Code"
            value={values.loginCode}
            onChange={e => {
              e.target.value = this.formatAsLoginCode(e, e.target.value)
              handleChange(e)
            }}
            onBlur={handleBlur}
            disabled={isSubmitting}
            autoComplete="off"
            autoFocus
            data-lpignore
            {...inputProps}
          />
        </Label>
        {errors.loginCode && (
          <Text
            f={1}
            mt={2}
            align={textProps.align || 'center'}
            children={errors.loginCode || ''}
          />
        )}
      </form>
    )
  }
}
const LoginCodeForm = withFormik({
  mapPropsToValues: ({ params }) => ({ ...params }),
  validationSchema: yup.object().shape({
    loginCode: yup.string()
  }),
  handleSubmit: (data, { props, setSubmitting, setErrors }) => {
    if (!data.loginCode) {
      setSubmitting(false)
      return null
    }
    const strippedLoginCode = data.loginCode.replace(/\D/g, '')
    fetch(`${api}/v1/users/${props.userId}/exchange_login_code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login_code: strippedLoginCode })
    })
      .then(res => {
        if (res.ok) {
          return res.json()
        } else {
          throw res.statusText
        }
      })
      .then(json => {
        window.localStorage.setItem('authToken', json.auth_token)
        setSubmitting(false)
        // associate current session with authenticated user and update email
        // stored in analytics
        analytics.identify(props.userId, { email: props.email })
        window.location.reload()
      })
      .catch(e => {
        console.error(e)
        setErrors({ loginCode: 'That doesn’t look like the code we sent.' })
        setSubmitting(false)
      })
  },
  displayName: 'LoginCodeForm'
})(InnerForm)
export default LoginCodeForm
