import React from 'react'
import faker from 'faker'
import 'jest-localstorage-mock'
import {render, RenderResult, fireEvent, cleanup, waitFor  } from '@testing-library/react'
import Login from './login'
import { ValidationStub } from '@/presentation/test'
import {  AuthenticationParams, Authentication } from '@/domain/usecases'
import { mockAccountModel } from '@/domain/test'
import { AccountModel } from '@/domain/models'
import { InvalidCredentialsError } from '@/domain/errors'
import { Router } from 'react-router-dom'
import {createMemoryHistory} from 'history'

class AuthenticationSpy implements Authentication {
    account = mockAccountModel()
    params: AuthenticationParams
    callsCount = 0

    async auth (params: AuthenticationParams): Promise<AccountModel>{
        this.params = params
        this.callsCount++
        return Promise.resolve(this.account)
    }
}

type SutTypes = {
    sut: RenderResult
    authenticationSpy: AuthenticationSpy
}

type SutParams = {
    validationError: string
}

const history = createMemoryHistory({ initialEntries: ['/login']})
const makeSut = (params?: SutParams): SutTypes => {
    const validationStub = new ValidationStub()
    const authenticationSpy = new AuthenticationSpy()
    validationStub.errorMessage = params?.validationError
    const sut = render(
        <Router history={history}>
    <Login validation={validationStub} authentication={authenticationSpy}/>
    </Router>
    )
    return {
        sut,
        authenticationSpy
    }
}

const simulateValidSubmit = async (sut: RenderResult, email = faker.internet.email(), password =  faker.internet.password()): Promise<void> => {
     populateEmailField(sut, email)
     populatePasswordField(sut, password)
     const form = sut.getByTestId('form')
     fireEvent.submit(form)
     await waitFor(() => form)
} 

const populateEmailField = (sut: RenderResult, email = faker.internet.email()): void => {
    const emailInput = sut.getByTestId('email')
    fireEvent.input(emailInput, {target: {value: email}})
}

const populatePasswordField = (sut: RenderResult, password = faker.internet.password()): void => {
    const passwordInput = sut.getByTestId('password')
    fireEvent.input(passwordInput, {target: {value: password}})
}

const testStatusForField = (sut: RenderResult, fieldName: string, validationError?: string): void => {
    const emailStatus = sut.getByTestId(`${fieldName}-status`)
    expect(emailStatus.title).toBe(validationError || "Tudo certo!")
    expect(emailStatus.textContent).toBe(validationError ? '🔴' : "🔵")
}

const testErrorWrapChildCount = (sut: RenderResult, count: number): void => {
    const errorWrap = sut.getByTestId('error-wrap')
    expect(errorWrap.childElementCount).toBe(count)
}

const testElementExists = (sut: RenderResult, fieldName: string): void => {
    const el = sut.getByTestId(fieldName)
    expect (el).toBeTruthy()
}

describe('Login Component', () => {
    afterEach(cleanup)
    beforeEach(() => {
        localStorage.clear()
    })

    test('Should start with initial state', () => {
        const validationError = faker.random.words()
        const {sut } = makeSut({validationError})
        testErrorWrapChildCount(sut, 0)
        const submitButton = sut.getByTestId('submit') as HTMLButtonElement
        expect (submitButton.disabled).toBe(true)
        const emailStatus = sut.getByTestId('email-status') as HTMLButtonElement
        expect (emailStatus.title).toBe(validationError)
        expect (emailStatus.textContent).toBe("🔴")
        const passwordStatus = sut.getByTestId('password-status') as HTMLButtonElement
        expect (passwordStatus.title).toBe(validationError)
        expect (passwordStatus.textContent).toBe("🔴")
    })

    test('Should show email error if Validation fails', () => {
        const validationError = faker.random.words()
        const {sut } = makeSut({validationError})
        const emailInput = sut.getByTestId('email')
        fireEvent.input(emailInput, {target: {value: faker.internet.email()}})
        const emailStatus = sut.getByTestId('email-status')
        expect(emailStatus.title).toBe(validationError)
        expect(emailStatus.textContent).toBe("🔴")
    })

    test('Should show password error if Validation fails', () => {
        const validationError = faker.random.words()
        const {sut } = makeSut({validationError})
        const passwordInput = sut.getByTestId('password')
        fireEvent.input(passwordInput, {target: {value: faker.internet.password()}})
        const passwordStatus = sut.getByTestId('password-status')
        expect(passwordStatus.title).toBe(validationError)
        expect(passwordStatus.textContent).toBe("🔴")
    })

    test('Should show valid email state if Validation suceeds', () => {
        const {sut} = makeSut()
        const emailInput = sut.getByTestId('email')
        fireEvent.input(emailInput, {target: {value: faker.internet.email()}})
        const emailStatus = sut.getByTestId('email-status')
        expect(emailStatus.title).toBe("Tudo certo!")
        expect(emailStatus.textContent).toBe("🔵")
    })

    test('Should show valid password state if Validation suceeds', () => {
        const {sut} = makeSut()
        const passwordInput = sut.getByTestId('password')
        fireEvent.input(passwordInput, {target: {value: faker.internet.password()}})
        const passwordStatus = sut.getByTestId('password-status')
        expect(passwordStatus.title).toBe("Tudo certo!")
        expect(passwordStatus.textContent).toBe("🔵")
    })

    test('Should enable submit button if form is valid', () => {
        const {sut} = makeSut()
        const emailInput = sut.getByTestId('email')
        fireEvent.input(emailInput, {target: {value: faker.internet.email()}})
        const passwordInput = sut.getByTestId('password')
        fireEvent.input(passwordInput, {target: {value: faker.internet.password()}})
        const submitButton = sut.getByTestId('submit') as HTMLButtonElement
        expect (submitButton.disabled).toBe(false)
    })

    test('Should show spinner on submit', async () => {
        const {sut} = makeSut()
        await simulateValidSubmit(sut)
        testElementExists(sut, 'spinner')
    })

    test('Should call Authentication with correct values', async () => {
        const {sut, authenticationSpy} = makeSut()
        const email = faker.internet.email()
        const password = faker.internet.password()
        await simulateValidSubmit(sut, email, password)
        expect (authenticationSpy.params).toEqual({
            email,
            password
        })
    })

    test('Should call Authentication only once', async() => {
        const {sut, authenticationSpy} = makeSut()
        await simulateValidSubmit(sut)
        await simulateValidSubmit(sut)
        expect (authenticationSpy.callsCount).toBe(1)
    })

    test('Should not call Authentication if form is invalid', () => {
        const validationError = faker.random.words()
        const {sut, authenticationSpy} = makeSut({ validationError})
        populateEmailField(sut)
        fireEvent.submit(sut.getByTestId('form'))
        expect (authenticationSpy.callsCount).toBe(0)
    })

    test('Should not call Authentication if form is invalid', async () => {
        const validationError = faker.random.words()
        const {sut, authenticationSpy} = makeSut({ validationError})
        await simulateValidSubmit(sut)
        expect (authenticationSpy.callsCount).toBe(0)
    })

    test('Should present error if Authentication fails', async () => {
        const {sut, authenticationSpy} = makeSut()
        const error = new InvalidCredentialsError()
        jest.spyOn(authenticationSpy, 'auth').mockReturnValueOnce(Promise.reject(error))
        await simulateValidSubmit(sut)
        const mainError = sut.getByTestId('main-error')
        //expect(mainError.textContent).toBe(error.message)
        testErrorWrapChildCount(sut, 1)
        })

    test('Should add accessTokento localstorage on success', async () => {
        const {sut, authenticationSpy} = makeSut()
        await simulateValidSubmit(sut)
        expect(localStorage.setItem).toHaveBeenCalledWith('accessToken', authenticationSpy.account.accessToken)
        expect(history.length).toBe(1)
        expect(history.location.pathname).toBe('/')
    })

    test('Should go to signup page', () => {
        const {sut} = makeSut()
        const register = sut.getByTestId('signup')
        fireEvent.click(register)
        expect(history.length).toBe(2)
        expect(history.location.pathname).toBe('/signup')
    })
})