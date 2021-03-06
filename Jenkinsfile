pipeline {
    agent any

    environment {
        CI = 'true'
        branch = "${env.BRANCH_NAME}"
        gitCommit = "${env.GIT_COMMIT}"
        buildNumber = "${env.BUILD_NUMBER}"
    }

    stages {
        stage('Install Docker Compose') {
            steps {
                sh 'curl -L "https://github.com/docker/compose/releases/download/1.24.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose'
                sh 'chmod +x /usr/local/bin/docker-compose'
            }
        }
        stage('Run unit & integration tests') {
            steps {
                sh 'docker-compose -f compose/docker-eth-env.yml build'
                sh 'docker-compose -f compose/docker-eth-env.yml run --rm truffle npm run test_local'
                sh 'docker-compose -f compose/docker-eth-env.yml down'
            }
        }
        stage('Publish to npm') {
            steps {
                sh 'docker-compose -f compose/docker-eth-env.yml build'
                sh 'docker-compose -f compose/docker-eth-env.yml run --rm truffle npm run publish'
                sh 'docker-compose -f compose/docker-eth-env.yml down'
            }
        }
        stage('Create ganache-cli with deployed contracts') {
            steps {
                echo "Building docker $branch"
                script {
                    image = docker.build("cued_blockchain:$branch-$buildNumber", "-f compose/ganache/Dockerfile .")
                    docker.withRegistry("https://registry.coreum.io/", "docker-registry") {
                        image.push()
                        image.push("$branch")
                    }
                }
            }
        }
    }
}
