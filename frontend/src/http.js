import axios from 'axios'

function Service(
    httpMethod,
    path,
    payload,
) {
    const url = "http://localhost:8000"
    const fullUrl = path.indexOf('://') > 0? path: url + path;

    const service = axios.create();

    const handleSuccess = (response) => response;

    const handleError = (error) => {
        console.warn(`handleError(${httpMethod} ${fullUrl})`, error, error.response)
        const status = error && error.response && error.response.status
        return Promise.reject(error);
    };

    service.interceptors.response.use(handleSuccess, handleError);

    switch (httpMethod) {
        case 'post':
            return service.request({
                method: 'POST',
                url: fullUrl,
                data: payload,
            });
        default:
            break;
    }
}

export default Service;
