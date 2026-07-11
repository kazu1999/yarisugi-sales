#!/bin/bash
# ==============================================================================
# yarisugi-sales Lambda Automated Packager Script
# ==============================================================================
# This script bundles all AWS Lambda functions into deployment-ready zip packages.
# Features:
#   - Dynamically copies yarisugi-sales/backend/lambda_functions/common/
#     to ensure shared logic (DynamoDB helpers) is up to date.
#   - Resolves dependencies using requirements.txt into a temp directory.
#   - Automatically excludes AWS-native packages (boto3, botocore, etc.)
#     to keep zip files lightweight.
#   - Saves zip packages to exact locations configured in Terraform main.tf.
# ==============================================================================

set -e

# Setup base directories
BACKEND_DIR="$(cd "$(dirname "$0")" && pwd)"
LAMBDA_FUNCTIONS_DIR="${BACKEND_DIR}/lambda_functions"
TERRAFORM_LAMBDA_DIR="${BACKEND_DIR}/terraform/lambda_functions"
TEMP_BUILD_DIR="${BACKEND_DIR}/temp_build"

echo "🧹 Cleaning up temporary build directories..."
rm -rf "${TEMP_BUILD_DIR}"
mkdir -p "${TEMP_BUILD_DIR}"
mkdir -p "${TERRAFORM_LAMBDA_DIR}"

COMMON_DIR="${LAMBDA_FUNCTIONS_DIR}/common"

if [ ! -d "${COMMON_DIR}" ]; then
    echo "❌ Error: Shared common directory not found at ${COMMON_DIR}"
    exit 1
fi

echo "🚀 Starting compilation for all Lambda functions..."

for func_dir in "${LAMBDA_FUNCTIONS_DIR}"/*; do
    if [ -d "${func_dir}" ] && [ "$(basename "${func_dir}")" != "common" ] && [ "$(basename "${func_dir}")" != "temp" ]; then
        FUNC_NAME=$(basename "${func_dir}")
        echo "📦 Packaging Lambda function [${FUNC_NAME}]..."
        
        # 1. Create a clean isolated temporary directory for packaging
        BUILD_PATH="${TEMP_BUILD_DIR}/${FUNC_NAME}"
        mkdir -p "${BUILD_PATH}"
        
        # 2. Copy the actual Lambda source files
        cp -R "${func_dir}/"* "${BUILD_PATH}/"
        
        # 3. Inject the shared common directory (DynamoDB helpers)
        cp -R "${COMMON_DIR}" "${BUILD_PATH}/common"
        
        # 4. Resolve python dependencies if requirements.txt exists
        if [ -f "${BUILD_PATH}/requirements.txt" ]; then
            echo "   📥 Resolving dependencies for ${FUNC_NAME}..."
            pip3 install -r "${BUILD_PATH}/requirements.txt" -t "${BUILD_PATH}" --quiet
            
            # Prune native libraries that AWS Lambda runtime provides by default to save size.
            # (boto3, botocore, s3transfer, urllib3, etc.)
            rm -rf "${BUILD_PATH}/boto3" \
                   "${BUILD_PATH}/botocore" \
                   "${BUILD_PATH}/s3transfer" \
                   "${BUILD_PATH}/urllib3" \
                   "${BUILD_PATH}/bin" \
                   "${BUILD_PATH}/_boto3"
        fi
        
        # 5. Clean up build garbage & meta files to keep packages small
        find "${BUILD_PATH}" -type d -name "__pycache__" -exec rm -rf {} +
        find "${BUILD_PATH}" -type f -name "*.pyc" -delete
        rm -rf "${BUILD_PATH}/requirements.txt"
        rm -rf "${BUILD_PATH}/"*_lambda.zip
        
        # 6. Determine the correct destination path based on Terraform main.tf
        if [ "${FUNC_NAME}" = "s3_presigned_url" ]; then
            ZIP_PATH="${TERRAFORM_LAMBDA_DIR}/s3_presigned_url_lambda.zip"
        elif [ "${FUNC_NAME}" = "faqs_lambda" ]; then
            ZIP_PATH="${TERRAFORM_LAMBDA_DIR}/faqs_lambda.zip"
        elif [ "${FUNC_NAME}" = "knowledge_manager" ]; then
            ZIP_PATH="${LAMBDA_FUNCTIONS_DIR}/knowledge_manager/knowledge_manager_optimized.zip"
        elif [ "${FUNC_NAME}" = "customers_lambda" ]; then
            ZIP_PATH="${LAMBDA_FUNCTIONS_DIR}/customers_lambda/customers_lambda.zip"
        else
            ZIP_PATH="${LAMBDA_FUNCTIONS_DIR}/${FUNC_NAME}/${FUNC_NAME}_lambda.zip"
        fi
        
        # 7. Compress into zip archive
        cd "${BUILD_PATH}"
        zip -r "${ZIP_PATH}" . > /dev/null
        cd "${BACKEND_DIR}"
        
        echo "   ✨ Successfully bundled: $(basename "${ZIP_PATH}")"
    fi
done

# Clean up temp build folder
rm -rf "${TEMP_BUILD_DIR}"
echo "🎉 Packaging completed successfully!"