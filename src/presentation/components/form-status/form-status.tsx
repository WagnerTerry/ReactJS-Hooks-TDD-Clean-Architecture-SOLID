import React, {useContext} from 'react'
import Styles from './form-status-styles.scss'
import Spinner  from '@/presentation/components/spinner/spinner'
import Context from '@/presentation/contexts/form/form-context'

// type Props = {
//   state: any
// }

const FormStatus: React.FC = () => {
  const {state} = useContext(Context)
  const {isLoading, mainError} = state
  return (
   <div data-testid="error-wrap" className={Styles.errorWrap}>
     { isLoading && <Spinner className={Styles.spinner} /> }
     {mainError && <span className={Styles.error}>{mainError.main}</span>}
   </div>
  )
}

export default FormStatus